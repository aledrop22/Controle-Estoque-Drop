export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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

        stats.salesByDate = salesMap;
        stats.totalDates = Object.keys(salesMap).length;
        stats.totalSalesAllTime = Object.values(salesMap).reduce((sum, val) => sum + val, 0);

        return res.json(stats);

    } catch (e) {
        return res.status(500).json({ error: e.message, stack: e.stack });
    }
}
