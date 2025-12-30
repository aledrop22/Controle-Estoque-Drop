/**
 * Endpoint para enviar notificações sobre SKUs removidos após 3 dias zerados
 * Este endpoint deve ser chamado diariamente via cron job
 * 
 * GET /api/notify-removed-skus
 */

import { getTrackedSkus, removeExpiredSkus } from './critical-stock-tracker.js';

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
 * Envia notificação via Discord
 */
async function sendDiscordNotification(skus) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
        console.log('Discord não configurado');
        return { success: false, reason: 'not_configured' };
    }

    try {
        const embeds = skus.map(sku => ({
            title: `⏰ ${sku.name}`,
            description: `SKU foi removido do rastreamento após 3 dias zerado`,
            color: 0xFF0000,
            fields: [
                { name: 'SKU', value: sku.sku, inline: true },
                { name: 'Dias Zerado', value: `${sku.daysAtZero} dias`, inline: true },
                { name: 'Zerou em', value: new Date(sku.zeroDate).toLocaleDateString('pt-BR'), inline: true },
                { name: 'Primeira vista com 1 un.', value: new Date(sku.firstSeenWithOne).toLocaleDateString('pt-BR'), inline: true }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Rastreamento de Estoque Crítico'
            }
        }));

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: '⏰ **SKUs REMOVIDOS DO RASTREAMENTO - 3 DIAS ZERADOS**',
                embeds: embeds.slice(0, 10)
            })
        });

        return { success: response.ok };
    } catch (error) {
        console.error('Erro ao enviar Discord:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Envia email
 */
async function sendEmailNotification(skus) {
    const sendgridKey = process.env.SENDGRID_API_KEY;
    const emailTo = process.env.NOTIFICATION_EMAIL;
    const emailFrom = process.env.EMAIL_FROM || 'noreply@estoque.com';

    if (!sendgridKey || !emailTo) {
        console.log('Email não configurado');
        return { success: false, reason: 'not_configured' };
    }

    try {
        const htmlContent = `
            <h2>⏰ SKUs Removidos do Rastreamento</h2>
            <p>Os seguintes SKUs completaram 3 dias com estoque zerado e foram removidos do rastreamento:</p>
            <table border="1" cellpadding="10" style="border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background-color: #f0f0f0;">
                        <th>SKU</th>
                        <th>Produto</th>
                        <th>Dias Zerado</th>
                        <th>Data que Zerou</th>
                        <th>Primeira Vista com 1 un.</th>
                    </tr>
                </thead>
                <tbody>
                    ${skus.map(sku => `
                        <tr style="background-color: #ffe6e6;">
                            <td><strong>${sku.sku}</strong></td>
                            <td>${sku.name}</td>
                            <td style="text-align: center;"><strong>${sku.daysAtZero} dias</strong></td>
                            <td>${new Date(sku.zeroDate).toLocaleDateString('pt-BR')}</td>
                            <td>${new Date(sku.firstSeenWithOne).toLocaleDateString('pt-BR')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <p style="color: #666; margin-top: 20px;">
                Estes produtos não aparecem mais no site e foram removidos do sistema de rastreamento.
            </p>
            <p style="color: #666;">
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
                subject: `⏰ ${skus.length} SKU(s) removidos após 3 dias zerados`,
                content: [
                    { type: 'text/plain', value: `${skus.length} SKUs foram removidos do rastreamento` },
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
 * Handler principal
 */
export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        // Obter SKUs que devem ser removidos (3+ dias zerados)
        const skusToRemove = getTrackedSkus({ shouldRemove: true });

        // Verificar também SKUs no dia 2 (alerta preventivo)
        const skusDay2 = getTrackedSkus().filter(s => s.daysAtZero === 2);

        if (skusToRemove.length === 0 && skusDay2.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'Nenhum SKU para notificar',
                removed: 0,
                day2Alert: 0
            });
        }

        let notifications = { telegram: false, discord: false, email: false };
        let message = '';

        // Remover SKUs expirados e notificar
        if (skusToRemove.length > 0) {
            message += `⏰ *REMOÇÃO DE SKUs DO RASTREAMENTO*\n\n`;
            message += `Os seguintes SKUs completaram 3 dias zerados e foram removidos:\n\n`;

            skusToRemove.forEach(sku => {
                message += `🔴 *${sku.name}*\n`;
                message += `   SKU: ${sku.sku}\n`;
                message += `   Zerou em: ${new Date(sku.zeroDate).toLocaleDateString('pt-BR')}\n`;
                message += `   Dias zerado: ${sku.daysAtZero}\n\n`;
            });

            // Remover os SKUs
            const removedSkus = removeExpiredSkus();

            // Enviar notificações
            const [telegram, discord, email] = await Promise.all([
                sendTelegramNotification(message),
                sendDiscordNotification(skusToRemove),
                sendEmailNotification(skusToRemove)
            ]);

            notifications = {
                telegram: telegram.success,
                discord: discord.success,
                email: email.success
            };
        }

        // Alerta preventivo para SKUs no dia 2
        if (skusDay2.length > 0) {
            let day2Message = `⚠️ *ALERTA: Remoção amanhã*\n\n`;
            day2Message += `Os seguintes SKUs estão há 2 dias zerados e serão removidos amanhã:\n\n`;

            skusDay2.forEach(sku => {
                day2Message += `🟠 *${sku.name}* (${sku.sku})\n`;
            });

            // Enviar alerta preventivo
            await sendTelegramNotification(day2Message);
        }

        const successCount = Object.values(notifications).filter(v => v).length;

        return res.status(200).json({
            success: true,
            message: `${skusToRemove.length} SKU(s) removido(s), ${successCount} notificação(ões) enviada(s)`,
            removed: skusToRemove.length,
            day2Alert: skusDay2.length,
            notifications,
            removedSkus: skusToRemove.map(sku => ({
                sku: sku.sku,
                name: sku.name,
                daysAtZero: sku.daysAtZero,
                zeroDate: sku.zeroDate,
                firstSeenWithOne: sku.firstSeenWithOne
            })),
            day2Skus: skusDay2.map(sku => ({
                sku: sku.sku,
                name: sku.name,
                daysAtZero: sku.daysAtZero
            }))
        });

    } catch (error) {
        console.error('Erro ao notificar SKUs removidos:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
