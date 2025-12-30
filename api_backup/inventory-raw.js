import { google } from 'googleapis';

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

        const rangeBase = SHEET_TAB ? `${SHEET_TAB}!${SHEET_RANGE}` : SHEET_RANGE;
        await jwt.authorize();
        const sheets = google.sheets({ version: 'v4', auth: jwt });
        const resp = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: rangeBase
        });

        const rows = resp.data.values || [];
        const headers = rows[0] || [];
        const dataRows = rows.slice(1);

        // Agrupa por produto sem dedupe
        const productMap = {};
        dataRows.forEach(r => {
            const name = r[headers.findIndex(h => h.toLowerCase().includes('produto'))] || 'Sem Nome';
            if (name === 'Sem Nome' || !name) return;
            const dateIdx = headers.findIndex(h => h.toLowerCase().includes('data da coleta'));
            const stockIdx = headers.findIndex(h => h.toLowerCase().includes('estoque'));
            const date = r[dateIdx] ? String(r[dateIdx]).split(' ')[0] : '';
            const stock = parseInt(r[stockIdx] || '0') || 0;

            if (!productMap[name]) {
                productMap[name] = [];
            }
            productMap[name].push({ date, stock });
        });

        // Para cada produto, mostra entradas brutas e após dedupe
        const debugData = Object.keys(productMap).map(name => {
            const raw = productMap[name];
            const byDate = new Map();
            raw.forEach(entry => byDate.set(entry.date, entry));
            const deduped = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));

            // Calcula vendas
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
            debugData: debugData.slice(0, 20) // primeiros 20 produtos
        });
    } catch (e) {
        console.error('Erro /api/inventory-raw:', e);
        return res.status(500).json({ error: e?.message || 'Erro interno' });
    }
}
