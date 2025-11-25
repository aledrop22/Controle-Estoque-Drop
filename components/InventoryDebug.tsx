import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Database } from 'lucide-react';
import type { Product } from '../src/types';

interface SummaryResp { loaded: boolean; count: number; sample: Product[] }

export const InventoryDebug: React.FC = () => {
    const [summary, setSummary] = useState<SummaryResp | null>(null);
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
            <p className="text-[10px] text-gray-400">Use este painel para validar se o backend está populando o cache antes da carga completa na tabela principal.</p>
        </div>
    );
};
