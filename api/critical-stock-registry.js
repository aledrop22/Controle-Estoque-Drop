import { getTrackedSkus, getTrackerStats, clearSku } from './critical-stock-tracker.js';

/**
 * Endpoint para consultar SKUs rastreados no sistema de estoque crítico
 * 
 * GET /api/critical-stock-registry
 * Query params:
 * - filter: 'zero' | 'one' | 'low' | 'all' (padrão: 'all')
 * - shouldRemove: 'true' | 'false' (opcional)
 * - format: 'json' | 'html' (padrão: 'json')
 * 
 * DELETE /api/critical-stock-registry?sku=<SKU_ID>
 * Remove um SKU específico do rastreamento
 */
export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // DELETE - Remover SKU específico
        if (req.method === 'DELETE') {
            const { sku } = req.query;

            if (!sku) {
                return res.status(400).json({
                    success: false,
                    error: 'SKU não fornecido'
                });
            }

            const existed = clearSku(sku);

            return res.status(200).json({
                success: true,
                message: existed
                    ? `SKU ${sku} removido do rastreamento`
                    : `SKU ${sku} não estava sendo rastreado`,
                removed: existed
            });
        }

        // GET - Listar SKUs rastreados
        if (req.method === 'GET') {
            const { filter = 'all', shouldRemove, format = 'json' } = req.query;

            // Configurar filtros
            const filterOptions = {};

            if (filter !== 'all') {
                filterOptions.stockStatus = filter;
            }

            if (shouldRemove !== undefined) {
                filterOptions.shouldRemove = shouldRemove === 'true';
            }

            // Obter dados
            const trackedSkus = getTrackedSkus(filterOptions);
            const stats = getTrackerStats();

            // Formato HTML para visualização no navegador
            if (format === 'html') {
                const html = generateHtmlReport(trackedSkus, stats);
                res.setHeader('Content-Type', 'text/html');
                return res.status(200).send(html);
            }

            // Formato JSON (padrão)
            return res.status(200).json({
                success: true,
                stats,
                filters: filterOptions,
                count: trackedSkus.length,
                skus: trackedSkus.map(sku => ({
                    sku: sku.sku,
                    name: sku.name,
                    currentStock: sku.currentStock,
                    entryDate: sku.entryDate,
                    entryStock: sku.entryStock,
                    firstSeenWithOne: sku.firstSeenWithOne,
                    zeroDate: sku.zeroDate,
                    daysAtZero: sku.daysAtZero,
                    shouldRemove: sku.shouldRemove,
                    daysUntilRemoval: sku.daysAtZero >= 3 ? 0 : Math.max(0, 3 - sku.daysAtZero),
                    status: getSkuStatusLabel(sku),
                    lastUpdate: sku.lastUpdate
                }))
            });
        }

        return res.status(405).json({
            success: false,
            error: 'Método não permitido'
        });

    } catch (error) {
        console.error('Erro no endpoint critical-stock-registry:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Retorna label de status do SKU
 */
function getSkuStatusLabel(sku) {
    if (sku.shouldRemove) {
        return '🔴 SERÁ REMOVIDO (3+ dias zerado)';
    }

    if (sku.currentStock === 0) {
        if (sku.daysAtZero === 2) {
            return '⚠️ CRÍTICO (remove amanhã)';
        }
        return `🟠 ZERADO (${sku.daysAtZero} dia(s))`;
    }

    if (sku.currentStock === 1) {
        return '🟡 1 UNIDADE (rastreado)';
    }

    if (sku.currentStock === 2) {
        return '🟢 2 UNIDADES';
    }

    return '✅ ESTOQUE OK';
}

/**
 * Gera relatório HTML
 */
function generateHtmlReport(skus, stats) {
    const now = new Date().toLocaleString('pt-BR');

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rastreamento de Estoque Crítico</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        .header p {
            opacity: 0.9;
            font-size: 14px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-value {
            font-size: 36px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .table-container {
            padding: 30px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        thead {
            background: #f8f9fa;
        }
        th {
            padding: 15px;
            text-align: left;
            font-size: 12px;
            text-transform: uppercase;
            color: #666;
            font-weight: 600;
            letter-spacing: 1px;
        }
        td {
            padding: 15px;
            border-bottom: 1px solid #f0f0f0;
        }
        tr:hover {
            background: #f8f9fa;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge-danger { background: #fee; color: #c00; }
        .badge-warning { background: #fff3cd; color: #856404; }
        .badge-info { background: #d1ecf1; color: #0c5460; }
        .badge-success { background: #d4edda; color: #155724; }
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #999;
        }
        .empty-state svg {
            width: 80px;
            height: 80px;
            margin-bottom: 20px;
            opacity: 0.3;
        }
        .footer {
            padding: 20px;
            text-align: center;
            color: #999;
            font-size: 12px;
            border-top: 1px solid #f0f0f0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Rastreamento de Estoque Crítico</h1>
            <p>SKUs com 1 ou 2 unidades rastreados por 3 dias após zerar</p>
            <p style="margin-top: 10px; font-size: 12px;">Atualizado em: ${now}</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">Total Rastreados</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);">
                <div class="stat-value" style="color: #856404;">${stats.withTwoUnits}</div>
                <div class="stat-label" style="color: #856404;">🟡 Com 2 Unidades</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #ff6b6b 0%, #ff8787 100%);">
                <div class="stat-value" style="color: white;">${stats.withOneUnit}</div>
                <div class="stat-label" style="color: white;">🔴 Com 1 Unidade</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.atZero}</div>
                <div class="stat-label">Zerados</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.day2AtZero}</div>
                <div class="stat-label">Dia 2 (remove amanhã)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.pendingRemoval}</div>
                <div class="stat-label">Pendente Remoção</div>
            </div>
        </div>
        
        <div class="table-container">
            ${skus.length === 0 ? `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    <p>Nenhum SKU está sendo rastreado no momento</p>
                </div>
            ` : `
                <table>
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Produto</th>
                            <th>Estoque Atual</th>
                            <th>Status</th>
                            <th>Data de Entrada</th>
                            <th>Dias no Zero</th>
                            <th>Data que Zerou</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${skus.map(sku => `
                            <tr>
                                <td><strong>${sku.sku}</strong></td>
                                <td>${sku.name}</td>
                                <td style="text-align: center; font-weight: bold; font-size: 18px;">
                                    ${sku.currentStock}
                                </td>
                                <td>
                                    <span class="badge ${getBadgeClass(sku)}">
                                        ${getSkuStatusLabel(sku)}
                                    </span>
                                </td>
                                <td style="font-weight: 600; color: #667eea;">
                                    ${sku.entryDate ? new Date(sku.entryDate).toLocaleDateString('pt-BR') : '-'}
                                    ${sku.entryStock ? `<br><small style="color: #999;">(${sku.entryStock} unid.)</small>` : ''}
                                </td>
                                <td style="text-align: center;">
                                    ${sku.daysAtZero > 0 ? `
                                        <strong style="color: ${sku.daysAtZero >= 2 ? '#c00' : '#f80'};">
                                            ${sku.daysAtZero} dia(s)
                                        </strong>
                                    ` : '-'}
                                </td>
                                <td>${sku.zeroDate ? new Date(sku.zeroDate).toLocaleDateString('pt-BR') : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `}
        </div>
        
        <div class="footer">
            Sistema de Controle de Estoque Drop &copy; ${new Date().getFullYear()}
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * Retorna classe CSS para o badge baseado no status
 */
function getBadgeClass(sku) {
    if (sku.shouldRemove || sku.daysAtZero >= 3) return 'badge-danger';
    if (sku.daysAtZero === 2) return 'badge-warning';
    if (sku.currentStock === 0) return 'badge-warning';
    if (sku.currentStock === 1) return 'badge-info';
    return 'badge-success';
}
