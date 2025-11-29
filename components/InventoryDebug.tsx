import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Database } from 'lucide-react';
import type { Product } from '../src/types';

interface SummaryResp { loaded: boolean; count: number; sample: Product[] }
interface RawDebugData {
    product: string;
    rawCount: number;
    dedupedCount: number;
    rawEntries: Array<{ date: string; stock: number }>;
    dedupedEntries: Array<{ date: string; stock: number; sales24h: number }>;
}
interface StatsDebug {
    totalProducts: number;
    totalHistoryRecords: number;
    avgHistoryPerProduct: number;
    totalDates: number;
    totalSalesAllTime: number;
    salesByDate: Record<string, number>;
    historyStats: Array<{ name: string; historyLength: number; firstDate: string; lastDate: string }>;
}

interface InventoryDebugProps {
    refStart?: string;
    refEnd?: string;
}

export const InventoryDebug: React.FC<InventoryDebugProps> = ({ refStart, refEnd }) => {
    const [summary, setSummary] = useState<SummaryResp | null>(null);
    const [rawDebug, setRawDebug] = useState<{ totalProducts: number; debugData: RawDebugData[] } | null>(null);
    const [statsDebug, setStatsDebug] = useState<StatsDebug | null>(null);
    const [rawError, setRawError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const loadSummary = async () => {
        setLoading(true);
        setRawError('');
        try {
            const resp = await fetch('/api/inventory/summary');
            if (!resp.ok) throw new Error('Falha summary ' + resp.status);
            const json = await resp.json();
            setSummary(json);
        } catch (e: any) {
            setRawError(e.message || 'Erro desconhecido');
        } finally {
            setLoading(false);
        }
    };

    const forceFull = async () => {
        setLoading(true);
        setRawError('');
        try {
            const resp = await fetch('/api/inventory');
            if (!resp.ok) throw new Error('Falha inventário ' + resp.status);
            const json = await resp.json();
            setSummary({ loaded: true, count: json.products?.length || 0, sample: (json.products || []).slice(0, 20) });
        } catch (e: any) {
            setRawError(e.message || 'Erro full');
        } finally {
            setLoading(false);
        }
    }

    const loadRawDebug = async () => {
        setLoading(true);
        setRawError('');
        try {
            const resp = await fetch('/api/inventory-raw');
            if (!resp.ok) throw new Error('Falha raw debug ' + resp.status);
            const json = await resp.json();
            setRawDebug(json);
        } catch (e: any) {
            setRawError(e.message || 'Erro raw debug');
        } finally {
            setLoading(false);
        }
    }

    const loadStatsDebug = async () => {
        setLoading(true);
        setRawError('');
        try {
            const params = new URLSearchParams();
            if (refStart) params.append('refStart', refStart);
            if (refEnd) params.append('refEnd', refEnd);
            const url = `/api/debug-stats${params.toString() ? '?' + params.toString() : ''}`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error('Falha stats debug ' + resp.status);
            const json = await resp.json();
            setStatsDebug(json);
            console.log('[Debug Stats]', json);
        } catch (e: any) {
            setRawError(e.message || 'Erro stats debug');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadSummary(); }, []);

    return (
        <div className="rounded-lg border bg-white shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2">
                <Database size={18} className="text-indigo-600" />
                <h3 className="text-sm font-semibold">Debug Inventário (Resumo)</h3>
                {loading && <span className="text-[10px] text-indigo-500 animate-pulse">carregando...</span>}
            </div>
            <div className="flex gap-2">
                <button onClick={loadSummary} className="px-2 py-1 text-xs bg-indigo-600 text-white rounded flex items-center gap-1">
                    <RefreshCw size={12} /> Resumo
                </button>
                <button onClick={forceFull} className="px-2 py-1 text-xs bg-gray-800 text-white rounded flex items-center gap-1">
                    <RefreshCw size={12} /> Forçar /api/inventory
                </button>
                <button onClick={loadRawDebug} className="px-2 py-1 text-xs bg-orange-600 text-white rounded flex items-center gap-1">
                    <Database size={12} /> Raw vs Dedupe
                </button>
                <button onClick={loadStatsDebug} className="px-2 py-1 text-xs bg-purple-600 text-white rounded flex items-center gap-1">
                    <Database size={12} /> Stats Vendas
                </button>
            </div>
            {rawError && (
                <div className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={12} /> {rawError}</div>
            )}
            {summary && (
                <div className="text-xs space-y-1">
                    <div><strong>Carregado:</strong> {summary.loaded ? 'Sim' : 'Não'} | <strong>Total:</strong> {summary.count}</div>
                    <div className="max-h-40 overflow-auto border rounded p-1 bg-gray-50">
                        {summary.sample.length === 0 ? <div className="text-gray-400">Sem itens</div> : (
                            <table className="text-[11px] w-full">
                                <thead>
                                    <tr className="text-gray-500">
                                        <th className="text-left">ID</th>
                                        <th className="text-left">Nome</th>
                                        <th className="text-right">Estoque</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summary.sample.map(p => (
                                        <tr key={p.id} className="odd:bg-white even:bg-gray-100">
                                            <td className="pr-2 truncate max-w-[80px]">{p.id}</td>
                                            <td className="pr-2 truncate max-w-[140px]" title={p.name}>{p.name}</td>
                                            <td className="text-right">{p.currentStock}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
            {rawDebug && (
                <div className="text-xs space-y-2">
                    <div><strong>Total Produtos:</strong> {rawDebug.totalProducts}</div>
                    <div className="max-h-80 overflow-auto border rounded p-2 bg-gray-50 space-y-3">
                        {rawDebug.debugData.map((item, idx) => (
                            <div key={idx} className="border-b pb-2">
                                <div className="font-semibold text-gray-800">{item.product}</div>
                                <div className="text-[10px] text-gray-600">
                                    Linhas brutas: {item.rawCount} | Após dedupe: {item.dedupedCount}
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                    <div>
                                        <div className="font-semibold text-red-700">Brutas (últimas 5):</div>
                                        {item.rawEntries.map((e, i) => (
                                            <div key={i} className="text-[10px]">{e.date}: {e.stock}</div>
                                        ))}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-green-700">Dedupe (últimas 5):</div>
                                        {item.dedupedEntries.map((e, i) => (
                                            <div key={i} className="text-[10px]">{e.date}: {e.stock} (↓ {e.sales24h})</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {statsDebug && (
                <div className="text-xs space-y-2 border-t pt-2">
                    <div className="font-semibold text-purple-700">📊 Estatísticas de Vendas</div>
                    <div className="text-[10px] text-purple-600 mb-1">Período: {statsDebug.periodStart} a {statsDebug.periodEnd}</div>
                    <div className="grid grid-cols-2 gap-2">
                        <div><strong>Total Produtos:</strong> {statsDebug.totalProducts}</div>
                        <div><strong>Total Registros Histórico:</strong> {statsDebug.totalHistoryRecords}</div>
                        <div><strong>Média Histórico/Produto:</strong> {statsDebug.avgHistoryPerProduct.toFixed(1)}</div>
                        <div><strong>Total Datas Únicas:</strong> {statsDebug.totalDates}</div>
                        <div className="col-span-2"><strong>Total Vendas (Todas):</strong> <span className="text-lg font-bold text-purple-600">{statsDebug.totalSalesAllTime}</span></div>
                    </div>
                    <div>
                        <div className="font-semibold mb-1">Vendas por Data (últimas 10):</div>
                        <div className="max-h-32 overflow-auto border rounded p-2 bg-gray-50 text-[10px] font-mono">
                            {Object.entries(statsDebug.salesByDate).slice(-10).map(([date, sales]) => (
                                <div key={date}>{date}: <strong>{sales}</strong> vendas</div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="font-semibold mb-1">Histórico por Produto (primeiros 5):</div>
                        <div className="max-h-40 overflow-auto border rounded p-2 bg-gray-50 text-[10px]">
                            {statsDebug.historyStats.slice(0, 5).map((item, idx) => (
                                <div key={idx} className="border-b pb-1 mb-1">
                                    <div className="font-semibold">{item.name}</div>
                                    <div className="text-gray-600">
                                        {item.historyLength} registros | {item.firstDate} → {item.lastDate}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            <p className="text-[10px] text-gray-400">Use este painel para validar se o backend está populando o cache antes da carga completa na tabela principal.</p>
        </div>
    );
};
