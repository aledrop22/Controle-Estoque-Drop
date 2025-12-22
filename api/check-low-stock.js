import { google } from 'googleapis';

// Threshold para considerar estoque baixo
const LOW_STOCK_THRESHOLD = 2;

// Configuração de cache para evitar spamming
let lastNotificationCache = new Map();
const NOTIFICATION_COOLDOWN_MS = 3600000; // 1 hora

/**
 * Verifica se deve enviar notificação baseado no cooldown
 */
function shouldNotify(productId, stock) {
    const key = `${productId}-${stock}`;
    const lastNotif = lastNotificationCache.get(key);
    const now = Date.now();

    if (!lastNotif || (now - lastNotif) > NOTIFICATION_COOLDOWN_MS) {
        lastNotificationCache.set(key, now);
        return true;
    }
    return false;
}

/**
 * Envia notificação via Telegram
 */
async function sendTelegramNotification(message) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        console.log('Telegram não configurado');
        return { success: false, reason: 'not_configured' };
    }

    try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });

        const data = await response.json();
        return { success: data.ok, data };
    } catch (error) {
        console.error('Erro ao enviar Telegram:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Envia notificação via Discord Webhook
 */
async function sendDiscordNotification(message, products) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
        console.log('Discord não configurado');
        return { success: false, reason: 'not_configured' };
    }

    try {
        const embeds = products.map(p => ({
            title: `⚠️ ${p.name}`,
            description: `Estoque: **${p.stock} unidades**`,
            color: p.stock === 0 ? 0xFF0000 : p.stock === 1 ? 0xFF6600 : 0xFFCC00,
            fields: [
                { name: 'SKU', value: p.id, inline: true },
                { name: 'Status', value: p.stock === 0 ? '🔴 ZERADO' : '🟡 BAIXO', inline: true },
                ...(p.url ? [{ name: 'Link', value: `[Ver produto](${p.url})`, inline: false }] : [])
            ],
            timestamp: new Date().toISOString()
        }));

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: message,
                embeds: embeds.slice(0, 10) // Discord limita a 10 embeds
            })
        });

        return { success: response.ok };
    } catch (error) {
        console.error('Erro ao enviar Discord:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Envia email via SendGrid ou outro serviço SMTP
 */
async function sendEmailNotification(message, products) {
    const sendgridKey = process.env.SENDGRID_API_KEY;
    const emailTo = process.env.NOTIFICATION_EMAIL;
    const emailFrom = process.env.EMAIL_FROM || 'noreply@estoque.com';

    if (!sendgridKey || !emailTo) {
        console.log('Email não configurado');
        return { success: false, reason: 'not_configured' };
    }

    try {
        const htmlContent = `
            <h2>🚨 Alerta de Estoque Baixo</h2>
            <p>${message}</p>
            <table border="1" cellpadding="10" style="border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f0f0f0;">
                        <th>Produto</th>
                        <th>SKU</th>
                        <th>Estoque</th>
                        <th>Status</th>
                        <th>Link</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr style="background-color: ${p.stock === 0 ? '#ffe6e6' : '#fff9e6'};">
                            <td>${p.name}</td>
                            <td>${p.id}</td>
                            <td><strong>${p.stock}</strong></td>
                            <td>${p.stock === 0 ? '🔴 ZERADO' : '🟡 BAIXO'}</td>
                            <td>${p.url ? `<a href="${p.url}">Ver</a>` : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <p style="color: #666; margin-top: 20px;">
                Enviado em ${new Date().toLocaleString('pt-BR')}
            </p>
        `;

        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${sendgridKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                personalizations: [{ to: [{ email: emailTo }] }],
                from: { email: emailFrom },
                subject: `⚠️ Alerta: ${products.length} produto(s) com estoque baixo`,
                content: [
                    { type: 'text/plain', value: message },
                    { type: 'text/html', value: htmlContent }
                ]
            })
        });

        return { success: response.ok || response.status === 202 };
    } catch (error) {
        console.error('Erro ao enviar email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtém produtos do Google Sheets
 */
async function getProducts() {
    try {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
        const spreadsheetId = process.env.SPREADSHEET_ID;
        const sheetName = process.env.SHEET_NAME || 'Controle';

        if (!credentials.client_email || !spreadsheetId) {
            throw new Error('Credenciais do Google Sheets não configuradas');
        }

        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A:Z`
        });

        const rows = response.data.values || [];
        if (rows.length === 0) return [];

        const headers = rows[0].map(h => String(h).trim().toLowerCase());
        const dataRows = rows.slice(1);

        const getIndex = (name) => headers.findIndex(h => h.includes(name));
        const idxProduto = getIndex('produto');
        const idxEstoque = getIndex('estoque');
        const idxId = getIndex('id') >= 0 ? getIndex('id') : getIndex('número');
        const idxUrl = getIndex('url') >= 0 ? getIndex('url') : getIndex('link');

        // Agrupar por produto e pegar o registro mais recente
        const productMap = new Map();
        dataRows.forEach(row => {
            const name = row[idxProduto];
            const stock = parseInt(row[idxEstoque]) || 0;
            const id = row[idxId] || name;
            const url = row[idxUrl];

            if (!name) return;

            // Atualizar sempre com o valor mais recente (última linha)
            productMap.set(id, {
                id: String(id).trim(),
                name: String(name).trim(),
                stock,
                url: url ? String(url).trim() : null
            });
        });

        return Array.from(productMap.values());
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        throw error;
    }
}

/**
 * Endpoint principal
 */
export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Buscar produtos
        const products = await getProducts();

        // Filtrar produtos com estoque baixo (≤ 2 unidades)
        const lowStockProducts = products.filter(p => p.stock <= LOW_STOCK_THRESHOLD);

        if (lowStockProducts.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Nenhum produto com estoque baixo',
                checked: products.length,
                lowStock: 0
            });
        }

        // Agrupar por nível de criticidade
        const outOfStock = lowStockProducts.filter(p => p.stock === 0);
        const veryLow = lowStockProducts.filter(p => p.stock === 1);
        const low = lowStockProducts.filter(p => p.stock === 2);

        // Criar mensagem
        let message = `🚨 *ALERTA DE ESTOQUE BAIXO*\n\n`;
        message += `Total de produtos com estoque ≤ 2: *${lowStockProducts.length}*\n\n`;

        if (outOfStock.length > 0) {
            message += `🔴 *ZERADOS (${outOfStock.length}):*\n`;
            outOfStock.forEach(p => {
                message += `• ${p.name} (${p.id})\n`;
            });
            message += '\n';
        }

        if (veryLow.length > 0) {
            message += `🟠 *1 UNIDADE (${veryLow.length}):*\n`;
            veryLow.forEach(p => {
                message += `• ${p.name} (${p.id})\n`;
            });
            message += '\n';
        }

        if (low.length > 0) {
            message += `🟡 *2 UNIDADES (${low.length}):*\n`;
            low.forEach(p => {
                message += `• ${p.name} (${p.id})\n`;
            });
        }

        // Filtrar produtos que devem ser notificados (respeitando cooldown)
        const productsToNotify = lowStockProducts.filter(p =>
            shouldNotify(p.id, p.stock)
        );

        if (productsToNotify.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Produtos em cooldown, notificação não enviada',
                lowStock: lowStockProducts.length,
                productsInCooldown: lowStockProducts.length
            });
        }

        // Enviar notificações
        const notifications = await Promise.all([
            sendTelegramNotification(message),
            sendDiscordNotification(message, productsToNotify),
            sendEmailNotification(message, productsToNotify)
        ]);

        const successCount = notifications.filter(n => n.success).length;

        return res.status(200).json({
            success: true,
            message: `${successCount} notificação(ões) enviada(s)`,
            lowStockProducts: lowStockProducts.length,
            notified: productsToNotify.length,
            notifications: {
                telegram: notifications[0].success,
                discord: notifications[1].success,
                email: notifications[2].success
            },
            details: lowStockProducts.map(p => ({
                id: p.id,
                name: p.name,
                stock: p.stock,
                status: p.stock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'
            }))
        });

    } catch (error) {
        console.error('Erro na verificação de estoque:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
