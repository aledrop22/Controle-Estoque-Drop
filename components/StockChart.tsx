import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { Product } from '../src/types';

interface StockChartProps { products: Product[]; }

// Função para calcular vendas diárias agregadas de todos os produtos
const useDailySales = (products: Product[]) => {
  return useMemo(() => {
    const salesMap: Record<string, number> = {};
    products.forEach(p => {
      const h = p.history;
      for (let i = 0; i < h.length - 1; i++) {
        const today = h[i];
        const next = h[i + 1];
        // Vendas = estoque anterior - estoque atual (se caiu)
        const sold = today.quantity > next.quantity ? (today.quantity - next.quantity) : 0;
        // Associar a data de 'next' como vendas daquele dia
        salesMap[next.date] = (salesMap[next.date] || 0) + sold;
      }
    });
    return salesMap; // { '2025-11-20': 34, ... }
  }, [products]);
};

export const StockChart: React.FC<StockChartProps> = ({ products }) => {
  // Todas as datas disponíveis (histórico global)
  const allDates = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => p.history.forEach(h => set.add(h.date)));
    return Array.from(set).sort();
  }, [products]);

  // Datas inicial e final padrão: últimos 10 dias para referência / período anterior para comparação
  const defaultEnd = allDates[allDates.length - 1];
  const defaultStartIndex = Math.max(0, allDates.length - 11);
  const defaultStart = allDates[defaultStartIndex];

  // Para comparação: desloca 30 dias para trás se possível
  const shiftDate = (iso: string, days: number) => {
    try {
      // Valida o formato da data
      if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) {
        return iso;
      }
      const d = new Date(iso + 'T00:00:00Z');
      if (isNaN(d.getTime())) {
        return iso;
      }
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    } catch {
      return iso;
    }
  };

  const compEndCandidate = shiftDate(defaultEnd, -30);
  const compStartCandidate = shiftDate(defaultStart, -30);
  const validCompStart = allDates.find(d => d === compStartCandidate) || allDates[0];
  const validCompEnd = allDates.find(d => d === compEndCandidate) || allDates[Math.min(10, allDates.length - 1)];

  const [refStart, setRefStart] = useState<string>(defaultStart);
  const [refEnd, setRefEnd] = useState<string>(defaultEnd);
  const [compStart, setCompStart] = useState<string>(validCompStart);
  const [compEnd, setCompEnd] = useState<string>(validCompEnd);

  const dailySalesMap = useDailySales(products);

  // Função de range inclusivo
  const rangeDates = (start: string, end: string) => allDates.filter(d => d >= start && d <= end);
  const refDates = rangeDates(refStart, refEnd);
  const compDates = rangeDates(compStart, compEnd);

  // Dataset contínuo apenas com dias dos intervalos (não mistura fora do range)
  const chartData = useMemo(() => {
    const union = Array.from(new Set([...refDates, ...compDates])).sort();
    return union.map(date => ({
      date,
      refSales: refDates.includes(date) ? (dailySalesMap[date] || 0) : undefined,
      compSales: compDates.includes(date) ? (dailySalesMap[date] || 0) : undefined
    }));
  }, [refDates, compDates, dailySalesMap]);

  // Máximo (pico) para escala Y (vendas)
  const maxSales = useMemo(() => chartData.reduce((m, p) => {
    const vals = [p.refSales, p.compSales].filter(v => typeof v === 'number') as number[];
    return Math.max(m, vals.length ? Math.max(...vals) : 0);
  }, 0), [chartData]);

  const yTicks = useMemo(() => {
    const step = 25;
    const arr: number[] = [];
    const limit = Math.max(step, Math.ceil(maxSales / step) * step);
    for (let v = 0; v <= limit; v += step) arr.push(v);
    if (!arr.includes(maxSales)) arr.push(maxSales);
    return arr;
  }, [maxSales]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Comparação de Vendas Diárias</h3>
      {/* Controles estilo calendário */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-col gap-3">
          <span className="text-sm font-semibold text-gray-700">Intervalo Referência</span>
          <div className="flex flex-wrap gap-2 items-center">
            <input type="date" value={refStart} onChange={e => setRefStart(e.target.value)} className="px-2 py-1 text-sm border rounded" />
            <span className="text-gray-500">até</span>
            <input type="date" value={refEnd} onChange={e => setRefEnd(e.target.value)} className="px-2 py-1 text-sm border rounded" />
          </div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-col gap-3">
          <span className="text-sm font-semibold text-gray-700">Intervalo Comparação</span>
          <div className="flex flex-wrap gap-2 items-center">
            <input type="date" value={compStart} onChange={e => setCompStart(e.target.value)} className="px-2 py-1 text-sm border rounded" />
            <span className="text-gray-500">até</span>
            <input type="date" value={compEnd} onChange={e => setCompEnd(e.target.value)} className="px-2 py-1 text-sm border rounded" />
          </div>
        </div>
      </div>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          {/* Eixo inferior: dias. Eixo vertical: vendas */}
          <LineChart data={chartData} margin={{ top: 10, right: 40, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickFormatter={d => d.slice(8, 10) + '/' + d.slice(5, 7)} />
            <YAxis dataKey="refSales" stroke="#9ca3af" fontSize={12} domain={[0, Math.max(...yTicks)]} ticks={yTicks} label={{ value: 'Vendas', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              formatter={(value, name) => [value, name === 'refSales' ? 'Referência' : 'Comparação']}
              labelFormatter={(label) => `Dia ${label.slice(8, 10)}/${label.slice(5, 7)}`}
              contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
            />
            <Legend formatter={(v) => v === 'refSales' ? 'Referência' : 'Comparação'} />
            <Line type="monotone" dataKey="refSales" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 5, stroke: '#0369a1', strokeWidth: 2 }} activeDot={{ r: 7 }} connectNulls>
              <LabelList dataKey="refSales" position="top" formatter={(v: any) => (typeof v === 'number' ? v : '')} className="text-xs" />
            </Line>
            <Line type="monotone" dataKey="compSales" stroke="#f97316" strokeWidth={3} dot={{ r: 5, stroke: '#c2410c', strokeWidth: 2 }} activeDot={{ r: 7 }} connectNulls>
              <LabelList dataKey="compSales" position="top" formatter={(v: any) => (typeof v === 'number' ? v : '')} className="text-xs" />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-[11px] text-gray-500 flex flex-wrap gap-4">
        <span>Valores exibidos como pontos rotulados.</span>
        <span>Eixo Y em múltiplos de 25 até o pico.</span>
        <span>Selecione datas diretamente pelo calendário.</span>
      </div>
    </div>
  );
};
