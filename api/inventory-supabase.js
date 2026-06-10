import { createClient } from '@supabase/supabase-js';

// Cache global para Serverless
let cache = { data: null, ts: 0 };
const CACHE_TTL_MS = 60_000; // 1 minuto

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
        const { VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

        if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            return res.status(500).json({ error: 'Credenciais Supabase não configuradas' });
        }

        const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY);
        
        const now = Date.now();
        const dateParam = req.query.date ? String(req.query.date) : null;
        const todayFlag = req.query.today === '1';
        const todayDate = new Date().toISOString().slice(0, 10);
        const effectiveFilterDate = dateParam || (todayFlag ? todayDate : null);

        // Cache check
        if (cache.data && (now - cache.ts) < CACHE_TTL_MS && (!effectiveFilterDate || cache.filterDate === effectiveFilterDate)) {
            const products = effectiveFilterDate ? cache.dataFiltered : cache.data;
            console.log('[DEBUG /api/inventory-supabase] Retornando do cache:', {
                filterDate: effectiveFilterDate || null,
                productsCount: products.length
            });
            return res.json({ source: 'cache', filterDate: effectiveFilterDate || null, products });
        }

        // Buscar produtos do Supabase
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar produtos do Supabase:', error);
            return res.status(500).json({ error: error.message });
        }

        // Buscar histórico de estoque do Supabase
        const { data: inventoryHistory, error: historyError } = await supabase
            .from('inventory_history')
            .select('*')
            .order('date', { ascending: false });

        if (historyError) {
            console.error('Erro ao buscar histórico do Supabase:', historyError);
            // Continuar mesmo sem histórico
        }

        console.log('[DEBUG] Histórico buscado:', inventoryHistory?.length || 0);

        // Agrupar histórico por produto
        const historyByProduct = {};
        if (inventoryHistory) {
            inventoryHistory.forEach(h => {
                if (!historyByProduct[h.product_id]) {
                    historyByProduct[h.product_id] = [];
                }
                historyByProduct[h.product_id].push({
                    date: h.date,
                    quantity: h.quantity,
                    price: h.price || 0
                });
            });
        }

        // Formatar produtos para o formato esperado pelo dashboard
        const formattedProducts = products.map(p => {
            const history = historyByProduct[p.id] || [];
            
            // Se não tem histórico, criar um registro inicial com estoque atual
            if (history.length === 0) {
                const today = new Date().toISOString().slice(0, 10);
                history.push({
                    date: today,
                    quantity: p.stock || 0,
                    price: p.price || 0
                });
            }

            // Ordenar histórico por data
            history.sort((a, b) => a.date.localeCompare(b.date));

            // Calcular vendas nas últimas 24h
            let sales24h = 0;
            if (history.length >= 2) {
                const latest = history[history.length - 1];
                const previous = history[history.length - 2];
                sales24h = Math.max(0, previous.quantity - latest.quantity);
            }

            return {
                id: p.id,
                name: p.name,
                category: 'Geral',
                price: p.price || 0,
                currentStock: p.stock || 0,
                captureDate: p.created_at ? p.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
                sales24h,
                minStockThreshold: 10,
                url: p.url || p.image_url,
                history: history.slice(-30) // Últimos 30 registros
            };
        });

        // Filtrar por data se necessário
        let filtered = formattedProducts;
        if (effectiveFilterDate) {
            filtered = formattedProducts.filter(p => p.captureDate === effectiveFilterDate);
        }

        cache = {
            data: formattedProducts,
            dataFiltered: effectiveFilterDate ? filtered : null,
            filterDate: effectiveFilterDate || null,
            ts: now
        };

        console.log('[DEBUG /api/inventory-supabase] Produtos retornados:', {
            filterDate: effectiveFilterDate || null,
            total: filtered.length,
            sample: filtered.slice(0, 3).map(p => ({
                id: p.id,
                name: p.name,
                currentStock: p.currentStock,
                sales24h: p.sales24h
            }))
        });

        return res.json({ source: 'live', filterDate: effectiveFilterDate || null, products: filtered });
    } catch (e) {
        console.error('Erro /api/inventory-supabase:', e);
        return res.status(500).json({ error: e?.message || 'Erro interno' });
    }
}
