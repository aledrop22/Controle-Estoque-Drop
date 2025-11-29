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
            avgHistoryPerProduct: 0
        };

        stats.avgHistoryPerProduct = stats.totalHistoryRecords / stats.totalProducts;

        // Calcula vendas como o StockChart faz
        const salesMap = {};
        products.forEach(p => {
            const h = p.history || [];
            for (let i = 0; i < h.length - 1; i++) {
                const prev = h[i];
                const curr = h[i + 1];
                const dateKey = curr.date;
                const sold = prev.quantity > curr.quantity ? (prev.quantity - curr.quantity) : 0;
                salesMap[dateKey] = (salesMap[dateKey] || 0) + sold;
            }
        });

        stats.salesByDate = salesMap;
        stats.totalDates = Object.keys(salesMap).length;
        stats.totalSalesAllTime = Object.values(salesMap).reduce((sum, val) => sum + val, 0);

        return res.json(stats);

    } catch (e) {
        return res.status(500).json({ error: e.message, stack: e.stack });
    }
}
