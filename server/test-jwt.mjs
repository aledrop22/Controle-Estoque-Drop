import 'dotenv/config';
import { google } from 'googleapis';

const {
    SHEET_ID,
    SHEET_TAB,
    SHEET_RANGE = 'A:I',
    GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
} = process.env;

console.log('=== TESTE DE CREDENCIAIS ===');
console.log('SHEET_ID:', SHEET_ID ? 'OK' : 'AUSENTE');
console.log('SHEET_TAB:', SHEET_TAB || 'NÃO DEFINIDO');
console.log('EMAIL:', GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'OK' : 'AUSENTE');
console.log('PRIVATE_KEY presente:', !!GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
console.log('PRIVATE_KEY começa com BEGIN:', GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.includes('BEGIN PRIVATE KEY'));

try {
    const jwt = new google.auth.JWT(
        GOOGLE_SERVICE_ACCOUNT_EMAIL,
        undefined,
        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );
    console.log('\n✓ JWT criado com sucesso');

    console.log('\nTestando autorização...');
    await jwt.authorize();
    console.log('✓ Autorização bem-sucedida');

    console.log('\nBuscando dados da planilha...');
    const sheets = google.sheets({ version: 'v4', auth: jwt });
    const rangeBase = SHEET_TAB ? `${SHEET_TAB}!${SHEET_RANGE}` : SHEET_RANGE;
    const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: rangeBase
    });

    const rows = resp.data.values || [];
    console.log(`✓ Planilha lida: ${rows.length} linhas encontradas`);
    console.log('Primeira linha (cabeçalho):', rows[0]);
    console.log('Segunda linha (exemplo):', rows[1]);

    console.log('\n=== SUCESSO ===');
    process.exit(0);
} catch (err) {
    console.error('\n✗ ERRO:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
}
