export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const {
        SHEET_ID,
        SHEET_TAB,
        SHEET_RANGE,
        GOOGLE_SERVICE_ACCOUNT_EMAIL,
        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    } = process.env;

    const debug = {
        SHEET_ID: SHEET_ID ? '✓ Configurado' : '✗ Não configurado',
        SHEET_TAB: SHEET_TAB ? `✓ ${SHEET_TAB}` : '✗ Não configurado',
        SHEET_RANGE: SHEET_RANGE ? `✓ ${SHEET_RANGE}` : '✗ Não configurado',
        GOOGLE_SERVICE_ACCOUNT_EMAIL: GOOGLE_SERVICE_ACCOUNT_EMAIL ? '✓ Configurado' : '✗ Não configurado',
        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? `✓ ${GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.length} chars` : '✗ Não configurado',
        environment: process.env.NODE_ENV || 'não definido'
    };

    res.json(debug);
}
