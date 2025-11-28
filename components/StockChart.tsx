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
        const prev = h[i];
        const curr = h[i + 1];
        // Normaliza para data local (YYYY-MM-DD) usando fuso Z e cortando ISO
        const dateKey = (curr.date || '').slice(0, 10);
        const sold = prev.quantity > curr.quantity ? (prev.quantity - curr.quantity) : 0;
        salesMap[dateKey] = (salesMap[dateKey] || 0) + sold;
      }
    });
    return salesMap; // { '2025-11-20': 34, ... }
  }, [products]);
};

export const StockChart: React.FC<StockChartProps> = ({ products }) => {
  const dailySalesMap = useDailySales(products);

  // Todas as datas disponíveis ordenadas
  const allDates = useMemo(() => {
    return Object.keys(dailySalesMap).sort();
  }, [dailySalesMap]);

  // Últimos 30 dias por padrão
  const [numDays, setNumDays] = useState<number>(30);

  // Dados para o gráfico: últimos N dias
  const chartData = useMemo(() => {
    const dates = allDates.slice(-numDays);
    return dates.map(date => ({
      date,
      vendas: dailySalesMap[date] || 0
    }));
  }, [allDates, dailySalesMap, numDays]);

  // Máximo para escala Y
  const maxSales = useMemo(() => {
    return Math.max(...chartData.map(d => d.vendas), 0);
  }, [chartData]);

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
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Vendas Diárias (Últimos Dias)</h3>
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Exibir últimos:</label>
        <select
          value={numDays}
          onChange={(e) => setNumDays(Number(e.target.value))}
          className="px-3 py-1 border border-gray-300 rounded text-sm"
        >
          <option value={7}>7 dias</option>
          <option value={15}>15 dias</option>
          <option value={30}>30 dias</option>
          <option value={60}>60 dias</option>
        </select>
        <span className="text-xs text-gray-500">
          Mostrando vendas diárias (diferença de estoque dia a dia)
        </span>
      </div>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 40, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              fontSize={12}
              tickFormatter={d => (d || '').slice(8, 10) + '/' + (d || '').slice(5, 7)}
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={12}
              domain={[0, Math.max(...yTicks)]}
              ticks={yTicks}
              label={{ value: 'Vendas', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value) => [value, 'Vendas']}
              labelFormatter={(label) => `Dia ${(label || '').slice(8, 10)}/${(label || '').slice(5, 7)}/${(label || '').slice(0, 4)}`}
              contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
            />
            <Line
              type="monotone"
              dataKey="vendas"
              stroke="#0ea5e9"
              strokeWidth={3}
              dot={{ r: 5, stroke: '#0369a1', strokeWidth: 2 }}
              activeDot={{ r: 7 }}
            >
              <LabelList dataKey="vendas" position="top" className="text-xs" />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-[11px] text-gray-500">
        <p>• Cada ponto representa as vendas totais do dia (soma de todos os produtos)</p>
        <p>• Vendas = Estoque do dia anterior - Estoque do dia atual (quando positivo)</p>
      </div>
    </div>
  );
};
