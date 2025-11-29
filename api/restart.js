// Endpoint para forçar recarga dos dados no Vercel (serverless)
let cache = { data: null, ts: 0 };

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Limpa cache global (válido apenas para instância atual)
    cache = { data: null, ts: 0 };
    console.log('[Vercel Restart] Cache limpo na função serverless.');
    res.json({ ok: true, message: 'Cache limpo na função serverless (Vercel).' });
}// Endpoint para forçar recarga dos dados no Vercel (serverless)
let cache = { data: null, ts: 0 };

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Limpa cache global (válido apenas para instância atual)
    cache = { data: null, ts: 0 };
    console.log('[Vercel Restart] Cache limpo na função serverless.');
    res.json({ ok: true, message: 'Cache limpo na função serverless (Vercel).' });
}
