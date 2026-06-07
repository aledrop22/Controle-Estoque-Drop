import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://lroxouwlciplbvitqzmh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const port = process.env.PORT || 4000;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_KEY não configurada');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ===== PRODUTOS =====

// GET /api/products - Obter produtos do usuário
app.get('/api/products', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products - Adicionar produtos (do scraper)
app.post('/api/products', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const { products } = req.body;
    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Products must be an array' });
    }

    const productsWithUser = products.map((p: any) => ({
      ...p,
      user_id: userId,
    }));

    const { data, error } = await supabase
      .from('products')
      .insert(productsWithUser)
      .select();

    if (error) throw error;
    res.json({ count: data?.length || 0, products: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id - Atualizar produto
app.put('/api/products/:id', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const { data, error } = await supabase
      .from('products')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select();

    if (error) throw error;
    res.json(data?.[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== HISTÓRICO DE ESTOQUE =====

// GET /api/inventory-history - Obter histórico
app.get('/api/inventory-history', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const productId = req.query.product_id as string;
    
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    let query = supabase
      .from('inventory_history')
      .select('*')
      .eq('user_id', userId);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory-history - Adicionar registro
app.post('/api/inventory-history', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const { data, error } = await supabase
      .from('inventory_history')
      .insert([{ ...req.body, user_id: userId }])
      .select();

    if (error) throw error;
    res.json(data?.[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== SCRAPER LOGS =====

// POST /api/scraper-logs - Registrar log do scraper
app.post('/api/scraper-logs', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const { data, error } = await supabase
      .from('scraper_logs')
      .insert([{ ...req.body, user_id: userId }])
      .select();

    if (error) throw error;
    res.json(data?.[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Supabase API server running' });
});

app.listen(port, () => {
  console.log(`🚀 API Supabase rodando em http://localhost:${port}`);
  console.log(`   - GET  /api/products`);
  console.log(`   - POST /api/products`);
  console.log(`   - GET  /api/inventory-history`);
  console.log(`   - POST /api/inventory-history`);
  console.log(`   - POST /api/scraper-logs`);
});
