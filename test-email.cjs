const { sendZeroedNotification } = require('./services/emailService');

(async () => {
    try {
        await sendZeroedNotification('TESTE_SKU', 'Produto Teste', new Date().toISOString());
        console.log('Teste de e-mail enviado!');
    } catch (err) {
        console.error('Erro ao enviar e-mail:', err);
    }
})();
