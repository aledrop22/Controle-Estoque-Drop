export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        return res.status(500).json({ ok: false, error: 'Missing Telegram config' });
    }

    const { produto, quantidade, quantidadeAnterior } = req.body || {};
    const quantity = Number(quantidade);
    const prevQuantity = quantidadeAnterior !== undefined ? Number(quantidadeAnterior) : undefined;

    const hasValidProduct = typeof produto === 'string' && produto.trim().length > 0;
    const hasValidQuantity = Number.isFinite(quantity);

    if (!hasValidProduct || !hasValidQuantity) {
        return res.status(400).json({ ok: false, error: 'Invalid payload' });
    }

    const shouldNotify = quantity === 1 && (
        prevQuantity === undefined || Number.isNaN(prevQuantity) || prevQuantity > 1
    );

    if (!shouldNotify) {
        return res.status(200).json({ ok: true, skipped: true });
    }

    const safeProduto = produto.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    const message = [
        '⚠️ <b>ATENÇÃO: ESTOQUE BAIXO</b>',
        '',
        `📦 Produto: <b>${safeProduto}</b>`,
        '📉 Resta apenas: <b>1 unidade</b>!'
    ].join('\n');

    try {
        const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });

        if (!tgResponse.ok) {
            throw new Error(`Telegram responded with ${tgResponse.status}`);
        }

        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Erro ao enviar para o Telegram', error);
        return res.status(500).json({ ok: false, error: 'Telegram send failed' });
    }
}
