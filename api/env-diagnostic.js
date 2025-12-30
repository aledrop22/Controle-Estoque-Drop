export default async function handler(req, res) {
    try {
        // Testa acesso às variáveis de ambiente essenciais
        const env = {
            SHEET_ID: process.env.SHEET_ID,
            SHEET_TAB: process.env.SHEET_TAB,
            SHEET_RANGE: process.env.SHEET_RANGE,
            GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ? 'OK' : 'MISSING',
        };

        // Testa acesso ao Google Sheets (apenas autenticação, sem buscar dados)
        let authStatus = 'not_tested';
        try {
            const { google } = await import('googleapis');
            const jwt = new google.auth.JWT(
                process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                undefined,
                process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
                ['https://www.googleapis.com/auth/spreadsheets.readonly']
            );
            await jwt.authorize();
            authStatus = 'success';
        } catch (e) {
            authStatus = e.message;
        }

        res.status(200).json({
            env,
            googleAuth: authStatus,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
