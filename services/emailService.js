const nodemailer = require('nodemailer');

// Configuração do transporter SMTP (exemplo Gmail, pode ser ajustado)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER || 'renidreshop@gmail.com',
        pass: process.env.SMTP_PASS || 'SUA_SENHA_AQUI'
    }
});

/**
 * Envia e-mail de notificação de SKU zerado
 * @param {string} sku Nome ou ID do produto
 * @param {string} nome Nome do produto
 * @param {string} data Data do zeramento
 */
async function sendZeroedNotification(sku, nome, data) {
    const mailOptions = {
        from: process.env.SMTP_USER || 'renidreshop@gmail.com',
        to: 'renidreshop@gmail.com',
        subject: `SKU Zerado: ${nome}`,
        text: `O produto ${nome} (SKU: ${sku}) zerou o estoque em ${data}. Favor pausar o anúncio e verificar reposição.`
    };
    await transporter.sendMail(mailOptions);
}

module.exports = { sendZeroedNotification };
