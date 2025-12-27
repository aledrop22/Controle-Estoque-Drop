export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const telegramVars = {
        'TELEGRAM_TOKEN': process.env.TELEGRAM_TOKEN || '(não encontrada)',
        'TELEGRAM_BOT_TOKEN': process.env.TELEGRAM_BOT_TOKEN || '(não encontrada)',
        'ID_DO_CHAT_DO_TELEGRAM': process.env.ID_DO_CHAT_DO_TELEGRAM || '(não encontrada)',
        'TELEGRAM_CHAT_ID': process.env.TELEGRAM_CHAT_ID || '(não encontrada)',
    };

    // Lista TODAS as env vars (apenas nomes, sem valores)
    const allEnvVars = Object.keys(process.env).filter(k => !k.includes('PATH')).sort();

    return res.json({
        telegramVarsChecked: telegramVars,
        allEnvVarsCount: allEnvVars.length,
        allEnvVarsNames: allEnvVars.slice(0, 30), // primeiras 30 para não poluir
        timestamp: new Date().toISOString()
    });
}
