export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { SHEET_ID, SHEET_TAB, SHEET_RANGE = 'A:E', GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY } = process.env;

    res.json({
        SHEET_ID: SHEET_ID || null,
        SHEET_TAB: SHEET_TAB || null,
        SHEET_RANGE,
        GOOGLE_SERVICE_ACCOUNT_EMAIL: GOOGLE_SERVICE_ACCOUNT_EMAIL || null,
        PRIVATE_KEY_PRESENT: !!(GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY && GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.includes('BEGIN PRIVATE KEY')),
        timestamp: new Date().toISOString()
    });
}
