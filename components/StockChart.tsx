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
        const dateKey = curr.date; // Já vem no formato YYYY-MM-DD da API
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

  // Padrão: últimos 10 dias para referência
  const defaultEnd = allDates[allDates.length - 1] || '';
  const defaultStartIndex = Math.max(0, allDates.length - 11);
  const defaultStart = allDates[defaultStartIndex] || allDates[0] || '';

  // Estado dos intervalos (usuário pode escolher datas via input)
  const [refStart, setRefStart] = useState<string>(defaultStart);
  const [refEnd, setRefEnd] = useState<string>(defaultEnd);

  // Filtra datas dentro do intervalo
  const refDates = useMemo(() => allDates.filter(d => d >= refStart && d <= refEnd), [allDates, refStart, refEnd]);

  // Dataset para o gráfico
  const chartData = useMemo(() => {
    return refDates.map(date => ({
      date,
      vendas: dailySalesMap[date] || 0
    }));
  }, [refDates, dailySalesMap]);

  // Máximo para escala Y
  const maxSales = useMemo(() => {
    return Math.max(...chartData.map(d => d.vendas), 0);
  }, [chartData]);

  const yTicks = useMemo(() => {
    const step = 25;
    const arr: number[] = [];
    const limit = Math.max(step, Math.ceil(maxSales / step) * step);
    for (let v = 0; v <= limit; v += step) arr.push(v);
    if (!arr.includes(maxSales) && maxSales > 0) arr.push(maxSales);
    return arr;
  }, [maxSales]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Vendas Diárias por Período</h3>

      {/* Seletor de período */}
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-6">
        <div className="text-sm font-semibold text-blue-900 mb-2">Selecione o Período</div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={refStart}
            onChange={e => setRefStart(e.target.value)}
            className="px-2 py-1 text-sm border rounded flex-1"
          />
          <span className="text-gray-500">até</span>
          <input
            type="date"
            value={refEnd}
            onChange={e => setRefEnd(e.target.value)}
            className="px-2 py-1 text-sm border rounded flex-1"
          />
        </div>
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
              domain={[0, 'auto']}
              ticks={yTicks}
              label={{ value: 'Vendas', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value) => [value, 'Vendas']}
              labelFormatter={(label) => `${(label || '').slice(8, 10)}/${(label || '').slice(5, 7)}/${(label || '').slice(0, 4)}`}
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

      <div className="mt-4 text-xs text-gray-500">
        <p>• Vendas diárias = diferença de estoque entre dias consecutivos (agregado de todos os produtos)</p>
        <p>• Selecione o período usando os campos de data acima</p>
      </div>
    </div>
  );
};