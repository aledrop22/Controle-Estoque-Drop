import { google } from 'googleapis';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const diagnostico = {
        timestamp: new Date().toISOString(),
        variaveis: {},
        conexao: {},
        planilha: {},
        erros: []
    };

    // 1. Verificar variáveis de ambiente
    const { SHEET_ID, SHEET_TAB, SHEET_RANGE = 'A:E', GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY } = process.env;

    diagnostico.variaveis = {
        SHEET_ID: SHEET_ID ? `✅ Configurado (${SHEET_ID.substring(0, 10)}...)` : '❌ NÃO CONFIGURADO',
        SHEET_TAB: SHEET_TAB || '(não definido - usará primeira aba)',
        SHEET_RANGE: SHEET_RANGE,
        GOOGLE_SERVICE_ACCOUNT_EMAIL: GOOGLE_SERVICE_ACCOUNT_EMAIL ? `✅ ${GOOGLE_SERVICE_ACCOUNT_EMAIL}` : '❌ NÃO CONFIGURADO',
        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: !GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY 
            ? '❌ NÃO CONFIGURADO'
            : GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.includes('BEGIN PRIVATE KEY')
                ? '✅ Formato válido (contém BEGIN PRIVATE KEY)'
                : '⚠️ Formato possivelmente inválido (não contém BEGIN PRIVATE KEY)'
    };

    // Verificar se há variáveis faltando
    if (!SHEET_ID) diagnostico.erros.push('SHEET_ID não está configurado no Vercel');
    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL) diagnostico.erros.push('GOOGLE_SERVICE_ACCOUNT_EMAIL não está configurado no Vercel');
    if (!GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) diagnostico.erros.push('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY não está configurado no Vercel');

    // Se alguma variável obrigatória estiver faltando, retornar já
    if (!SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
        diagnostico.conexao.status = '❌ Não foi possível testar - variáveis faltando';
        diagnostico.resumo = 'Configure as variáveis de ambiente no Vercel antes de continuar';
        return res.status(200).json(diagnostico);
    }

    // 2. Testar autenticação JWT
    try {
        const privateKey = GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n');
        
        const jwt = new google.auth.JWT(
            GOOGLE_SERVICE_ACCOUNT_EMAIL,
            undefined,
            privateKey,
            ['https://www.googleapis.com/auth/spreadsheets.readonly']
        );

        await jwt.authorize();
        diagnostico.conexao.autenticacao = '✅ JWT autorizado com sucesso';

        // 3. Testar acesso à planilha
        try {
            const sheets = google.sheets({ version: 'v4', auth: jwt });
            const rangeBase = SHEET_TAB ? `${SHEET_TAB}!${SHEET_RANGE}` : SHEET_RANGE;
            
            const resp = await sheets.spreadsheets.values.get({
                spreadsheetId: SHEET_ID,
                range: rangeBase
            });

            const rows = resp.data.values || [];
            const headers = rows[0] || [];

            diagnostico.planilha = {
                status: '✅ Acesso à planilha OK',
                totalLinhas: rows.length,
                totalColunas: headers.length,
                cabecalhos: headers.slice(0, 10), // Primeiros 10 cabeçalhos
                primeiraLinhaDados: rows[1] ? rows[1].slice(0, 5) : null,
                range: rangeBase
            };

            // Verificar colunas esperadas
            const colunasEsperadas = ['Data da Coleta', 'Produto', 'Estoque'];
            const colunasEncontradas = [];
            const colunasFaltando = [];

            colunasEsperadas.forEach(col => {
                const encontrada = headers.some(h => String(h).toLowerCase().includes(col.toLowerCase()));
                if (encontrada) {
                    colunasEncontradas.push(col);
                } else {
                    colunasFaltando.push(col);
                }
            });

            diagnostico.planilha.colunasEsperadas = {
                encontradas: colunasEncontradas,
                faltando: colunasFaltando.length > 0 ? colunasFaltando : null
            };

            if (colunasFaltando.length > 0) {
                diagnostico.erros.push(`Colunas não encontradas: ${colunasFaltando.join(', ')}`);
            }

            diagnostico.resumo = rows.length > 1 
                ? `✅ Tudo OK! ${rows.length - 1} linhas de dados encontradas.`
                : '⚠️ Planilha acessível mas sem dados';

        } catch (sheetsError) {
            diagnostico.planilha.status = '❌ Erro ao acessar planilha';
            diagnostico.planilha.erro = sheetsError.message;
            
            if (sheetsError.message.includes('not found')) {
                diagnostico.erros.push('Planilha não encontrada. Verifique se o SHEET_ID está correto.');
            } else if (sheetsError.message.includes('permission') || sheetsError.message.includes('403')) {
                diagnostico.erros.push(`Sem permissão. Compartilhe a planilha com: ${GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
            } else {
                diagnostico.erros.push(`Erro ao acessar planilha: ${sheetsError.message}`);
            }
            
            diagnostico.resumo = '❌ Falha no acesso à planilha';
        }

    } catch (authError) {
        diagnostico.conexao.autenticacao = '❌ Falha na autenticação';
        diagnostico.conexao.erro = authError.message;
        
        if (authError.message.includes('invalid_grant')) {
            diagnostico.erros.push('Credenciais inválidas. Verifique se a chave privada está correta.');
        } else if (authError.message.includes('PEM')) {
            diagnostico.erros.push('Formato da chave privada inválido. Verifique se \\n foi substituído corretamente.');
        } else {
            diagnostico.erros.push(`Erro de autenticação: ${authError.message}`);
        }
        
        diagnostico.resumo = '❌ Falha na autenticação com Google';
    }

    return res.status(200).json(diagnostico);
}
