export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const type = (req.query.type || 'vars').toLowerCase();

    // ============ DEBUG VARS ============
    if (type === 'vars' || type === 'env') {
        const {
            SHEET_ID,
            SHEET_TAB,
            SHEET_RANGE,
            GOOGLE_SERVICE_ACCOUNT_EMAIL,
            GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
        } = process.env;

        const debug = {
            SHEET_ID: SHEET_ID ? '✓ Configurado' : '✗ Não configurado',
            SHEET_TAB: SHEET_TAB ? `✓ ${SHEET_TAB}` : '✗ Não configurado',
            SHEET_RANGE: SHEET_RANGE ? `✓ ${SHEET_RANGE}` : '✗ Não configurado',
            GOOGLE_SERVICE_ACCOUNT_EMAIL: GOOGLE_SERVICE_ACCOUNT_EMAIL ? '✓ Configurado' : '✗ Não configurado',
            GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? `✓ ${GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.length} chars` : '✗ Não configurado',
            environment: process.env.NODE_ENV || 'não definido'
        };

        return res.json(debug);
    }

    // ============ DEBUG ENV (raw values) ============
    if (type === 'raw') {
        const { SHEET_ID, SHEET_TAB, SHEET_RANGE = 'A:E', GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY } = process.env;

        return res.json({
            SHEET_ID: SHEET_ID || null,
            SHEET_TAB: SHEET_TAB || null,
            SHEET_RANGE,
            GOOGLE_SERVICE_ACCOUNT_EMAIL: GOOGLE_SERVICE_ACCOUNT_EMAIL || null,
            PRIVATE_KEY_PRESENT: !!(GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY && GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.includes('BEGIN PRIVATE KEY')),
            timestamp: new Date().toISOString()
        });
    }

    // ============ DEBUG STATS ============
    if (type === 'stats') {
        try {
            // Busca dados da API inventory
            const baseUrl = req.headers.host?.includes('localhost')
                ? 'http://localhost:3000'
                : `https://${req.headers.host}`;

            const response = await fetch(`${baseUrl}/api/inventory`);
            const data = await response.json();

            if (!data.products || !Array.isArray(data.products)) {
                return res.json({ error: 'Dados inválidos', data });
            }

            const products = data.products;
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

            // Estatísticas
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

            stats.avgHistoryPerProduct = stats.totalHistoryRecords / stats.totalProducts;

            // Filtra datas do período
            const periodDates = allDates.filter(d => d >= periodStart && d <= periodEnd);

            // Calcula vendas APENAS no período
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

            stats.salesByDate = salesMap;
            stats.totalDates = Object.keys(salesMap).length;
            stats.totalSalesAllTime = Object.values(salesMap).reduce((sum, val) => sum + val, 0);

            return res.json(stats);

        } catch (e) {
            return res.status(500).json({ error: e.message, stack: e.stack });
        }
    }

    return res.status(400).json({ error: `Tipo desconhecido: ${type}. Use ?type=vars|raw|stats` });
}
