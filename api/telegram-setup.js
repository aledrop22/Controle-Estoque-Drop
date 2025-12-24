/**
 * Endpoint auxiliar para configurar o Telegram
 * Ajuda a obter o Chat ID automaticamente
 */

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
        return res.status(400).json({
            error: 'TELEGRAM_BOT_TOKEN não configurado',
            instructions: [
                '1. Fale com @BotFather no Telegram',
                '2. Digite /newbot e siga as instruções',
                '3. Copie o TOKEN fornecido',
                '4. Adicione TELEGRAM_BOT_TOKEN nas variáveis de ambiente da Vercel'
            ]
        });
    }

    try {
        // Busca as atualizações recentes do bot
        const url = `https://api.telegram.org/bot${botToken}/getUpdates`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.ok) {
            return res.status(400).json({
                error: 'Token inválido ou bot não está funcionando',
                details: data,
                help: 'Verifique se o TELEGRAM_BOT_TOKEN está correto'
            });
        }

        // Extrai todos os chat IDs únicos
        const chatIds = new Set();
        const messagesInfo = [];

        if (data.result && data.result.length > 0) {
            data.result.forEach(update => {
                if (update.message && update.message.chat) {
                    const chat = update.message.chat;
                    chatIds.add(chat.id);
                    messagesInfo.push({
                        chat_id: chat.id,
                        username: chat.username || chat.first_name || 'Sem nome',
                        text: update.message.text || '(sem texto)',
                        date: new Date(update.message.date * 1000).toLocaleString('pt-BR')
                    });
                }
            });

            return res.status(200).json({
                success: true,
                message: '✅ Chat IDs encontrados!',
                chat_ids: Array.from(chatIds),
                messages: messagesInfo,
                next_steps: [
                    '1. Copie um dos chat_id acima',
                    '2. Adicione TELEGRAM_CHAT_ID nas variáveis de ambiente da Vercel',
                    '3. Faça um novo deploy ou aguarde o próximo cron job'
                ],
                test_command: 'Acesse /api/check-low-stock para testar as notificações'
            });
        } else {
            return res.status(200).json({
                success: false,
                message: '⚠️ Nenhuma mensagem encontrada',
                instructions: [
                    '1. Abra o Telegram',
                    '2. Busque o seu bot pelo username (ex: @seu_bot)',
                    '3. Envie qualquer mensagem para o bot (ex: /start ou "olá")',
                    '4. Aguarde alguns segundos',
                    '5. Acesse novamente esta página: /api/telegram-setup'
                ],
                bot_info: {
                    token_configured: true,
                    updates_count: 0
                }
            });
        }
    } catch (error) {
        console.error('Erro ao buscar updates:', error);
        return res.status(500).json({
            error: 'Erro ao conectar com o Telegram',
            details: error.message
        });
    }
}
