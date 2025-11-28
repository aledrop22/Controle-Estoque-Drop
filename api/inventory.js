import { google } from 'googleapis';

// Cache global para Serverless
let cache = { data: null, ts: 0 };
const CACHE_TTL_MS = 60_000; // 1 minuto

function mapRowsToProducts(rows, dateFilter) {
    if (!rows || rows.length === 0) return [];
    const headers = rows[0].map(h => String(h).trim());
    const dataRows = rows.slice(1);

    const getIndex = (name) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
    const idxDataColeta = getIndex('Data da Coleta');
    const idxProduto = getIndex('Produto');
    const idxEstoque = getIndex('Estoque');

    const productHistory = {};
    dataRows.forEach(r => {
        const id = r[getIndex('ID do Produto')] || r[getIndex('Número Item')] || r[idxProduto] || '';
        const name = r[idxProduto] || 'Sem Nome';
        if (name === 'Sem Nome' || !name) return;

        const key = String(id || name).trim();
        const rawDate = r[idxDataColeta];
        if (!rawDate) return;

        const dateOnly = String(rawDate).split(' ')[0];
        const stock = parseInt(r[idxEstoque] || '0') || 0;

        if (!productHistory[key]) {
            productHistory[key] = { name, rows: [] };
        }
        productHistory[key].rows.push({
            date: dateOnly,
            stock,
            rawRow: r
        });
    });

    Object.keys(productHistory).forEach(key => {
        const hist = productHistory[key];
        // Deduplicar por data: manter a última ocorrência da data
        const byDate = new Map();
        hist.rows.forEach(entry => {
            byDate.set(entry.date, entry); // sobrescreve mantendo o último visto
        });
        hist.rows = Array.from(byDate.values());
        hist.rows.sort((a, b) => a.date.localeCompare(b.date));

        for (let i = 1; i < hist.rows.length; i++) {
            const prev = hist.rows[i - 1];
            const curr = hist.rows[i];
            curr.sales24h = Math.max(0, prev.stock - curr.stock);
        }
        if (hist.rows.length > 0) {
            hist.rows[0].sales24h = 0;
        }
    });

    let productsToReturn = [];
    if (dateFilter) {
        Object.keys(productHistory).forEach(key => {
            const hist = productHistory[key];
            const entry = hist.rows.find(r => r.date === dateFilter);
            if (entry) {
                productsToReturn.push({ key, entry, hist });
            }
        });
    } else {
        Object.keys(productHistory).forEach(key => {
            const hist = productHistory[key];
            if (hist.rows.length > 0) {
                const entry = hist.rows[hist.rows.length - 1];
                productsToReturn.push({ key, entry, hist });
            }
        });
    }

    const getColumn = (row, name) => {
        const idx = getIndex(name);
        return idx >= 0 ? row[idx] : undefined;
    };

    return productsToReturn.map(({ key, entry, hist }) => {
        const r = entry.rawRow;
        const id = getColumn(r, 'ID do Produto') || getColumn(r, 'Número Item') || key;
        const name = getColumn(r, 'Produto') || hist.name;
        const category = 'Geral';
        const price = parseFloat(getColumn(r, 'Preço') || '0') || 0;
        const currentStock = entry.stock;
        const sales24h = entry.sales24h || 0;
        const captureDate = entry.date;

        const historyEntries = hist.rows.slice(-30).map(h => {
            // Valida e formata a data
            const dateStr = h.date;
            let validDate;

            // Tenta criar a data de forma segura
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                validDate = new Date(dateStr + 'T12:00:00Z');
            } else {
                validDate = new Date(dateStr);
            }

            // Se a data for inválida, usa a data atual
            if (isNaN(validDate.getTime())) {
                validDate = new Date();
            }

            return {
                date: validDate.toISOString(),
                quantity: h.stock
            };
        });

        return {
            id: String(id),
            name,
            category,
            price,
            currentStock,
            captureDate,
            sales24h,
            minStockThreshold: 10,
            history: historyEntries
        };
    });
}

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { SHEET_ID, SHEET_RANGE = 'A:E', SHEET_TAB, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY } = process.env;

        if (!SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
            return res.status(500).json({ error: 'Credenciais não configuradas' });
        }

        const jwt = new google.auth.JWT(
            GOOGLE_SERVICE_ACCOUNT_EMAIL,
            undefined,
            GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
            ['https://www.googleapis.com/auth/spreadsheets.readonly']
        );

        const now = Date.now();
        const dateParam = req.query.date ? String(req.query.date) : null;
        const todayFlag = req.query.today === '1';
        const todayDate = new Date().toISOString().slice(0, 10);
        const effectiveFilterDate = dateParam || (todayFlag ? todayDate : null);

        // Cache check
        if (cache.data && (now - cache.ts) < CACHE_TTL_MS && (!effectiveFilterDate || cache.filterDate === effectiveFilterDate)) {
            const products = effectiveFilterDate ? cache.dataFiltered : cache.data;
            return res.json({ source: 'cache', filterDate: effectiveFilterDate || null, products });
        }

        const rangeBase = SHEET_TAB ? `${SHEET_TAB}!${SHEET_RANGE}` : SHEET_RANGE;
        await jwt.authorize();
        const sheets = google.sheets({ version: 'v4', auth: jwt });
        const resp = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: rangeBase
        });

        const rows = resp.data.values || [];
        const allProducts = mapRowsToProducts(rows, null);
        let filtered = allProducts;

        if (effectiveFilterDate) {
            filtered = mapRowsToProducts(rows, effectiveFilterDate);
            if (filtered.length === 0) {
                const headers = rows[0] || [];
                const idxData = headers.findIndex(h => String(h).toLowerCase().includes('data da coleta'));
                if (idxData >= 0) {
                    const dates = rows.slice(1)
                        .map(r => String(r[idxData]).split(' ')[0])
                        .filter(d => /\d{4}-\d{2}-\d{2}/.test(d));
                    const latest = dates.sort().reverse()[0];
                    if (latest && latest !== effectiveFilterDate) {
                        filtered = mapRowsToProducts(rows, latest);
                    }
                }
            }
        }

        cache = {
            data: allProducts,
            dataFiltered: effectiveFilterDate ? filtered : null,
            filterDate: effectiveFilterDate || null,
            ts: now
        };

        return res.json({ source: 'live', filterDate: effectiveFilterDate || null, products: filtered });
    } catch (e) {
        console.error('Erro /api/inventory:', e);
        return res.status(500).json({ error: e?.message || 'Erro interno' });
    }
}
