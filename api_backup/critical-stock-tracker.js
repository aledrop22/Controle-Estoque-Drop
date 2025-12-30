/**
 * Sistema de rastreamento de SKUs críticos (1 ou 2 unidades)
 * 
 * Mantém registro de:
 * - SKUs que entraram no estoque crítico com 1 ou 2 unidades
 * - Data de entrada no rastreamento
 * - Data de quando foram zerados
 * - Mantém por 3 dias após zerar
 * - Remove automaticamente no 3º dia com notificação
 */

// Storage em memória (Vercel KV seria ideal para produção)
let criticalStockRegistry = new Map();

/**
 * Estrutura de dados para cada SKU rastreado:
 * {
 *   sku: string,
 *   name: string,
 *   entryDate: Date,              // Data de entrada no rastreamento
 *   entryStock: number,           // Estoque quando entrou (1 ou 2)
 *   firstSeenWithOne: Date,       // Quando foi visto pela primeira vez com 1 unidade
 *   currentStock: number,         // Estoque atual
 *   zeroDate: Date | null,        // Quando zerou
 *   daysAtZero: number,           // Dias no estoque zero
 *   shouldRemove: boolean,        // Se deve ser removido (3 dias completos)
 *   lastUpdate: Date              // Última atualização
 * }
 */

/**
 * Carrega dados persistidos (simulado - use Vercel KV na produção)
 */
function loadRegistry() {
    // Em produção, carregar de Vercel KV ou outro storage
    // Por enquanto, retorna o Map em memória
    return criticalStockRegistry;
}

/**
 * Salva dados (simulado - use Vercel KV na produção)
 */
async function saveRegistry(registry) {
    // Em produção, salvar no Vercel KV:
    // await kv.set('critical_stock_registry', JSON.stringify(Array.from(registry.entries())));
    criticalStockRegistry = registry;
    return true;
}

/**
 * Registra ou atualiza um SKU com 1 ou 2 unidades
 */
export function registerCriticalSku(sku, name, currentStock) {
    const registry = loadRegistry();
    const now = new Date();

    if (!registry.has(sku)) {
        // Novo SKU com 1 ou 2 unidades - registrar
        if (currentStock === 1 || currentStock === 2) {
            registry.set(sku, {
                sku,
                name,
                entryDate: now,
                entryStock: currentStock,
                firstSeenWithOne: currentStock === 1 ? now : null,
                currentStock,
                zeroDate: null,
                daysAtZero: 0,
                shouldRemove: false,
                lastUpdate: now
            });
            console.log(`[TRACKER] Novo SKU crítico registrado: ${sku} - ${name} (${currentStock} unid.)`);
        }
    } else {
        // SKU já existe - atualizar
        const entry = registry.get(sku);
        const previousStock = entry.currentStock;
        entry.currentStock = currentStock;
        entry.lastUpdate = now;
        entry.name = name; // Atualizar nome se mudou

        // Se zerou agora
        if (previousStock > 0 && currentStock === 0) {
            entry.zeroDate = now;
            entry.daysAtZero = 0;
            console.log(`[TRACKER] SKU zerou: ${sku} - ${name}`);
        }

        // Se voltou a ter estoque depois de zerar
        if (previousStock === 0 && currentStock > 0) {
            console.log(`[TRACKER] SKU voltou ao estoque: ${sku} - ${name} (${currentStock} unidades)`);
            // Reset do contador de dias no zero
            entry.zeroDate = null;
            entry.daysAtZero = 0;
            entry.shouldRemove = false;

            // Se voltou com 1 unidade, registrar data
            if (currentStock === 1 && !entry.firstSeenWithOne) {
                entry.firstSeenWithOne = now;
            }
        }

        // Se passou de 2 para 1 unidade
        if (previousStock === 2 && currentStock === 1 && !entry.firstSeenWithOne) {
            entry.firstSeenWithOne = now;
            console.log(`[TRACKER] SKU passou de 2 para 1 unidade: ${sku} - ${name}`);
            // Marcar para remoção no 3º dia
            if (diffDays >= 3) {
                entry.shouldRemove = true;
                console.log(`[TRACKER] SKU completou 3 dias zerado: ${sku} - ${name} (será removido)`);
            }
        }

        registry.set(sku, entry);
    }

    saveRegistry(registry);
    return registry.get(sku);
}

/**
 * Processa lista completa de produtos e atualiza registry
 */
export function updateRegistry(products) {
    const registry = loadRegistry();
    const now = new Date();
    const updates = {
        newTracked: [],
        zeroed: [],
        restocked: [],
        toRemove: []
    };

    // Atualizar produtos existentes e adicionar novos com 1 unidade
    products.forEach(product => {
        const sku = String(product.id).trim();
        const name = product.name;
        const stock = product.stock;

        // Registrar SKUs com 1 ou 2 unidades (threshold)
        if (stock <= 2 && stock > 0) {
            const wasTracked = registry.has(sku);
            const entry = registerCriticalSku(sku, name, stock);

            if (!wasTracked && stock === 1) {
                updates.newTracked.push(entry);
            }
        } else if (stock === 0 && registry.has(sku)) {
            // Atualizar SKUs que zeraram
            const entry = registerCriticalSku(sku, name, stock);
            if (entry.zeroDate && entry.daysAtZero === 0) {
                updates.zeroed.push(entry);
            }
        } else if (stock > 2 && registry.has(sku)) {
            // SKU saiu do estoque crítico (>2 unidades)
            const entry = registry.get(sku);
            if (entry.currentStock <= 2) {
                updates.restocked.push({ ...entry, currentStock: stock });
            }
            // Remove do rastreamento se estoque voltou ao normal
            registry.delete(sku);
            console.log(`[TRACKER] SKU removido do rastreamento (estoque normal): ${sku} - ${name} (${stock} unidades)`);
        }
    });

    // Verificar SKUs que devem ser removidos (3 dias no zero)
    for (const [sku, entry] of registry.entries()) {
        if (entry.shouldRemove) {
            updates.toRemove.push(entry);
        }
    }

    saveRegistry(registry);
    return updates;
}

/**
 * Remove SKUs que completaram 3 dias zerados
 */
export function removeExpiredSkus() {
    const registry = loadRegistry();
    const removed = [];

    for (const [sku, entry] of registry.entries()) {
        if (entry.shouldRemove) {
            removed.push({ ...entry });
            registry.delete(sku);
            console.log(`[TRACKER] SKU removido após 3 dias zerado: ${sku} - ${entry.name}`);
        }
    }

    saveRegistry(registry);
    return removed;
}

/**
 * Obtém todos os SKUs rastreados
 */
export function getTrackedSkus(filterOptions = {}) {
    const registry = loadRegistry();
    let entries = Array.from(registry.values());

    // Filtros opcionais
    if (filterOptions.stockStatus) {
        if (filterOptions.stockStatus === 'zero') {
            entries = entries.filter(e => e.currentStock === 0);
        } else if (filterOptions.stockStatus === 'one') {
            entries = entries.filter(e => e.currentStock === 1);
        } else if (filterOptions.stockStatus === 'low') {
            entries = entries.filter(e => e.currentStock <= 2 && e.currentStock > 0);
        }
    }

    if (filterOptions.shouldRemove !== undefined) {
        entries = entries.filter(e => e.shouldRemove === filterOptions.shouldRemove);
    }

    // Ordenar por dias no zero (maior primeiro)
    entries.sort((a, b) => {
        if (a.daysAtZero !== b.daysAtZero) {
            return b.daysAtZero - a.daysAtZero;
        }
        return a.name.localeCompare(b.name);
    });

    return entries;
}

/**
 * Obtém estatísticas do rastreamento
 */
export function getTrackerStats() {
    const entries = getTrackedSkus();

    return {
        total: entries.length,
        withTwoUnits: entries.filter(e => e.currentStock === 2).length,

        /**
         * Limpa SKU específico do rastreamento
         */
        export function clearSku(sku) {
        const registry = loadRegistry();
        const existed = registry.has(sku);
        registry.delete(sku);
        saveRegistry(registry);
        return existed;
    }

    /**
     * Limpa todo o registry (use com cuidado!)
     */
    export function clearAllRegistry() {
        criticalStockRegistry = new Map();
        saveRegistry(criticalStockRegistry);
        return true;
    }
