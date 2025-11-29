import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import compression from 'compression';

const app = express();
app.use(cors());
app.use(compression()); // Adiciona compressão gzip
app.use(express.json({ limit: '10mb' })); // Aumenta limite de payload

const {
    SHEET_ID,
    SHEET_RANGE = 'A:E',
    SHEET_TAB,
    GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    PORT = 4000
} = process.env;

if (!SHEET_ID) console.warn('SHEET_ID ausente no .env');
if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) console.warn('Credenciais de service account ausentes');

let jwt;
if (GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    jwt = new google.auth.JWT(
        GOOGLE_SERVICE_ACCOUNT_EMAIL,
        undefined,
        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );
}

const sheetsApi = () => google.sheets({ version: 'v4', auth: jwt });

// Cache simples em memória para reduzir chamadas
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

    // Agrupa todas as linhas por produto (ID ou Nome)
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

    // Ordena histórico por data e calcula vendas reais (diferença de estoque)
    Object.keys(productHistory).forEach(key => {
        const hist = productHistory[key];
        hist.rows.sort((a, b) => a.date.localeCompare(b.date));

        // Calcula vendas entre dias consecutivos
        for (let i = 1; i < hist.rows.length; i++) {
            const prev = hist.rows[i - 1];
            const curr = hist.rows[i];
            // Vendas = estoque anterior - estoque atual (se positivo)
            curr.sales24h = Math.max(0, prev.stock - curr.stock);
        }
        // Primeira entrada não tem referência anterior
        if (hist.rows.length > 0) {
            hist.rows[0].sales24h = 0;
        }
    });

    // Se houver filtro de data, retorna apenas produtos dessa data
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
        // Sem filtro: retorna última entrada de cada produto
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

        // Monta histórico completo deste produto (últimos 30 dias ou todos disponíveis)
        const historyEntries = hist.rows.slice(-30).map(h => ({
            date: new Date(h.date + 'T12:00:00Z').toISOString(),
            quantity: h.stock
        }));

        return {
            id: String(id),
            name,
            category,
            price,
            currentStock,
            captureDate,
            sales24h, // Agora é a diferença real de estoque!
            minStockThreshold: 10,
            history: historyEntries
        };
    });
}

app.get('/api/inventory', async (req, res) => {
    try {
        if (!jwt) return res.status(500).json({ error: 'Credenciais não configuradas' });

        const now = Date.now();
        const dateParam = req.query.date ? String(req.query.date) : null;
        const todayFlag = req.query.today === '1';
        const todayDate = new Date().toISOString().slice(0, 10);
        const effectiveFilterDate = dateParam || (todayFlag ? todayDate : null);

        // Se cache existir e não há filtro de data diferente, reutiliza
        if (cache.data && (now - cache.ts) < CACHE_TTL_MS && (!effectiveFilterDate || cache.filterDate === effectiveFilterDate)) {
            const products = effectiveFilterDate ? cache.dataFiltered : cache.data;
            return res.json({ source: 'cache', filterDate: effectiveFilterDate || null, products });
        }

        const rangeBase = SHEET_TAB ? `${SHEET_TAB}!${SHEET_RANGE}` : SHEET_RANGE;
        await jwt.authorize();
        const sheets = sheetsApi();
        const resp = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: rangeBase
        });
        const rows = resp.data.values || [];
        const allProducts = mapRowsToProducts(rows, null);
        let filtered = allProducts;
        if (effectiveFilterDate) {
            filtered = mapRowsToProducts(rows, effectiveFilterDate);
            // Fallback: se não houver linhas para a data solicitada, usar a data mais recente presente
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
});

// Endpoint summary: retorna contagem e primeiros itens para debug leve
app.get('/api/inventory/summary', (req, res) => {
    try {
        if (!cache.data) return res.json({ loaded: false, count: 0, sample: [] });
        res.json({ loaded: true, count: cache.data.length, sample: cache.data.slice(0, 20) });
    } catch (e) {
        res.status(500).json({ error: e?.message || 'Erro interno summary' });
    }
});

// Endpoint de debug: retorna dados brutos da planilha
app.get('/api/inventory/raw', async (req, res) => {
    try {
        if (!jwt) return res.status(500).json({ error: 'Credenciais não configuradas' });

        const rangeBase = SHEET_TAB ? `${SHEET_TAB}!${SHEET_RANGE}` : SHEET_RANGE;
        await jwt.authorize();
        const sheets = sheetsApi();
        const resp = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: rangeBase
        });
        const rows = resp.data.values || [];
        return res.json({ range: rangeBase, rowCount: rows.length, rows });
    } catch (e) {
        console.error('Erro /api/inventory/raw:', e);
        return res.status(500).json({ error: e?.message || 'Erro interno' });
    }
});

app.get('/api/health', (_req, res) => {
    res.json({ ok: true, pid: process.pid });
});

// Debug: Raw vs Dedupe (alinha com /api/inventory-raw do Vercel)
app.get('/api/inventory-raw', async (req, res) => {
    try {
        if (!jwt) return res.status(500).json({ error: 'Credenciais não configuradas' });

        const rangeBase = SHEET_TAB ? `${SHEET_TAB}!${SHEET_RANGE}` : SHEET_RANGE;
        await jwt.authorize();
        const sheets = sheetsApi();
        const resp = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: rangeBase
        });

        const rows = resp.data.values || [];
        const headers = rows[0] || [];
        const dataRows = rows.slice(1);

        const findIdx = (name) => headers.findIndex(h => String(h).toLowerCase().includes(name.toLowerCase()));
        const idxProduto = findIdx('Produto');
        const idxData = findIdx('Data da Coleta');
        const idxEstoque = findIdx('Estoque');

        const productMap = {};
        dataRows.forEach(r => {
            const name = r[idxProduto] || 'Sem Nome';
            if (name === 'Sem Nome' || !name) return;
            const date = r[idxData] ? String(r[idxData]).split(' ')[0] : '';
            const stock = parseInt(r[idxEstoque] || '0') || 0;
            if (!productMap[name]) productMap[name] = [];
            productMap[name].push({ date, stock });
        });

        const debugData = Object.keys(productMap).map(name => {
            const raw = productMap[name];
            const byDate = new Map();
            raw.forEach(entry => byDate.set(entry.date, entry));
            const deduped = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
            for (let i = 1; i < deduped.length; i++) {
                deduped[i].sales24h = Math.max(0, deduped[i - 1].stock - deduped[i].stock);
            }
            if (deduped.length > 0) deduped[0].sales24h = 0;
            return {
                product: name,
                rawCount: raw.length,
                dedupedCount: deduped.length,
                rawEntries: raw.slice(-5),
                dedupedEntries: deduped.slice(-5)
            };
        });

        return res.json({
            totalProducts: Object.keys(productMap).length,
            debugData: debugData.slice(0, 20)
        });
    } catch (e) {
        console.error('Erro /api/inventory-raw:', e);
        return res.status(500).json({ error: e?.message || 'Erro interno' });
    }
});

// Debug: Estatísticas de vendas (alinha com /api/debug-stats do Vercel)
app.get('/api/debug-stats', async (req, res) => {
    try {
        // Garante que temos produtos no cache
        if (!cache.data) {
            // Força uma carga
            const rangeBase = SHEET_TAB ? `${SHEET_TAB}!${SHEET_RANGE}` : SHEET_RANGE;
            await jwt?.authorize();
            const sheets = sheetsApi();
            const resp = await sheets.spreadsheets.values.get({
                spreadsheetId: SHEET_ID,
                range: rangeBase
            });
            const rows = resp.data.values || [];
            cache.data = mapRowsToProducts(rows, null);
            cache.ts = Date.now();
        }

        const products = cache.data || [];
        const refStart = req.query.refStart || null;
        const refEnd = req.query.refEnd || null;

        // Coleta todas as datas únicas disponíveis
        const allDatesSet = new Set();
        products.forEach(p => {
            (p.history || []).forEach(h => allDatesSet.add(h.date));
        });
        const allDates = Array.from(allDatesSet).sort();

        // Determina período padrão se não fornecido
        const defaultEnd = allDates[allDates.length - 1] || '';
        const defaultStartIndex = Math.max(0, allDates.length - 11);
        const defaultStart = allDates[defaultStartIndex] || allDates[0] || '';

        const periodStart = refStart || defaultStart;
        const periodEnd = refEnd || defaultEnd;

        const stats = {
            totalProducts: products.length,
            productsWithHistory: products.filter(p => p.history?.length > 0).length,
            historyStats: products.map(p => ({
                name: p.name,
                historyLength: p.history?.length || 0,
                firstDate: p.history?.[0]?.date || 'N/A',
                lastDate: p.history?.[p.history.length - 1]?.date || 'N/A'
            })),
            totalHistoryRecords: products.reduce((sum, p) => sum + (p.history?.length || 0), 0),
            avgHistoryPerProduct: 0,
            periodStart,
            periodEnd
        };
        stats.avgHistoryPerProduct = stats.totalHistoryRecords / (stats.totalProducts || 1);

        // Filtra datas do período
        const periodDates = allDates.filter(d => d >= periodStart && d <= periodEnd);

        // Calcula vendas APENAS no período (como StockChart corrigido)
        const salesMap = {};
        periodDates.forEach(currentDate => {
            let totalSales = 0;
            products.forEach(p => {
                const h = p.history || [];
                const currentIndex = h.findIndex(entry => entry.date === currentDate);
                if (currentIndex <= 0) return;
                const prevEntry = h[currentIndex - 1];
                const currEntry = h[currentIndex];
                const sold = Math.max(0, prevEntry.quantity - currEntry.quantity);
                totalSales += sold;
            });
            salesMap[currentDate] = totalSales;
        });

        const result = {
            ...stats,
            salesByDate: salesMap,
            totalDates: Object.keys(salesMap).length,
            totalSalesAllTime: Object.values(salesMap).reduce((sum, v) => sum + v, 0)
        };
        return res.json(result);
    } catch (e) {
        console.error('Erro /api/debug-stats:', e);
        return res.status(500).json({ error: e?.message || 'Erro interno' });
    }
});

// Endpoint para reiniciar os servidores
app.post('/api/restart', (_req, res) => {
    try {
        const { spawn } = require('child_process');
        const path = require('path');

        // Executa o script start.ps1 em segundo plano
        const scriptPath = path.join(__dirname, '..', 'start.ps1');
        const child = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', scriptPath], {
            detached: true,
            stdio: 'ignore',
            cwd: path.join(__dirname, '..')
        });

        child.unref();

        res.json({ ok: true, message: 'Servidores sendo reiniciados...' });

        // Aguarda um pouco antes de encerrar este processo
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    } catch (e) {
        console.error('Erro ao reiniciar:', e);
        res.status(500).json({ error: e?.message || 'Erro ao reiniciar' });
    }
});

// Exibe variáveis carregadas e status básico do JWT
app.get('/api/debug-env', (_req, res) => {
    res.json({
        SHEET_ID: SHEET_ID || null,
        SHEET_TAB: SHEET_TAB || null,
        SHEET_RANGE,
        GOOGLE_SERVICE_ACCOUNT_EMAIL: GOOGLE_SERVICE_ACCOUNT_EMAIL || null,
        PRIVATE_KEY_PRESENT: !!(GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY && GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.includes('BEGIN PRIVATE KEY')),
        JWT_INITIALIZED: !!jwt
    });
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sheet API server on http://localhost:${PORT}`);
    console.log('[Sheets Debug] Variáveis carregadas:', {
        SHEET_ID: !!SHEET_ID,
        SHEET_TAB: SHEET_TAB || '(não definido)',
        SHEET_RANGE,
        GOOGLE_SERVICE_ACCOUNT_EMAIL: !!GOOGLE_SERVICE_ACCOUNT_EMAIL,
        PRIVATE_KEY_PRESENT: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.includes('BEGIN PRIVATE KEY') : false,
        JWT_INITIALIZED: !!jwt,
        PID: process.pid
    });
});

server.on('error', (err) => {
    console.error('[Sheets Debug] Erro no servidor:', err);
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('[Sheets Debug] uncaughtException:', err);
    console.error(err.stack);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Sheets Debug] unhandledRejection:', reason);
    console.error('Promise:', promise);
});

// Log simples quando health é acessado (para confirmar tráfego)
app.use((req, _res, next) => {
    if (req.path === '/api/health') {
        console.log('[Sheets Debug] /api/health acessado');
    }
    next();
});

// Keep process alive with heartbeat
setInterval(() => {
    // Heartbeat silencioso a cada 30s
}, 30000);
