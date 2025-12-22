/// <reference types="vite/client" />
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { MOCK_DATA } from './constants';
import { Product, ProductAnalysis, DashboardMetrics } from './types';
import { StatsCard } from '../components/StatsCard';
import { StockChart } from '../components/StockChart';
import { GeminiInsight } from '../components/GeminiInsight';
import { InventoryDebug } from '../components/InventoryDebug';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  Layers,
  Search,
  ArrowDown,
  ArrowUp,
  Minus,
  Filter,
  ArrowUpDown,
  Calendar,
  Award
} from 'lucide-react';

type SortKey = 'name' | 'stock' | 'sales' | 'status';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'ALL' | 'LOW_CRITICAL' | 'NORMAL';
type TimeRange = '24h' | '7d' | '15d' | '30d';

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(MOCK_DATA);
  const [searchTerm, setSearchTerm] = useState('');
  const hasGeminiKey = !!import.meta.env.VITE_GEMINI_API_KEY;
  const [autoLoadError, setAutoLoadError] = useState<string>('');
  const [autoLoaded, setAutoLoaded] = useState<boolean>(false);
  const [loadAttempts, setLoadAttempts] = useState<number>(0);
  const [isLoadingInventory, setIsLoadingInventory] = useState<boolean>(false);
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [isRestarting, setIsRestarting] = useState<boolean>(false);
  // Debug Panel toggle (persistente)
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(() => {
    try { return localStorage.getItem('showDebugPanel') === '1'; } catch { return false; }
  });
  const [chartPeriod, setChartPeriod] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // Callback estável para evitar loop infinito
  const handlePeriodChange = useCallback((start: string, end: string) => {
    setChartPeriod({ start, end });
  }, []);

  // Custom Filter State
  const [customThreshold, setCustomThreshold] = useState<number>(10);

  // Table Sorting & Filtering State
  const [sortKey, setSortKey] = useState<SortKey>('sales');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [soldRange, setSoldRange] = useState<TimeRange | null>(null);

  // Top Sellers State
  const [topSellersRange, setTopSellersRange] = useState<TimeRange>('24h');
  const [showTopViewButton, setShowTopViewButton] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('showTopViewButton');
      return v === null ? true : v === '1';
    } catch { return true; }
  });
  const [viewButtonPromptSeen, setViewButtonPromptSeen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('viewButtonPromptSeen') === '1';
    } catch { return false; }
  });

  // Helper to calculate sales over N days
  const calculateSales = (p: Product, days: number): number => {
    const h = p.history;
    if (h.length < 2) return 0;

    const todayIndex = h.length - 1;
    const pastIndex = Math.max(0, todayIndex - days);

    let totalSold = 0;

    // Iterate from past to today
    for (let i = pastIndex; i < todayIndex; i++) {
      const startQty = h[i].quantity;
      const endQty = h[i + 1].quantity;
      if (startQty > endQty) {
        totalSold += (startQty - endQty);
      }
    }

    return totalSold;
  };

  // Data util: última data global do histórico
  const latestDate = useMemo(() => {
    const dates: string[] = [];
    products.forEach(p => p.history.forEach(h => dates.push(h.date)));
    if (dates.length === 0) return null;
    dates.sort();
    return dates[dates.length - 1] || null;
  }, [products]);

  // Novos produtos (primeiro registro exatamente na última data)
  const newProducts = useMemo(() => {
    if (!latestDate) return [] as Product[];

    const today = new Date(latestDate);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

    return products.filter(p => {
      if (!p.history || p.history.length === 0) return false;
      const firstDate = p.history[0].date;
      // Mostra produtos cujo primeiro registro é nos últimos 7 dias ou mais antigo
      return firstDate >= sevenDaysAgoStr;
    }).map(p => {
      const firstDate = p.history[0].date;
      const daysDiff = Math.floor((today.getTime() - new Date(firstDate).getTime()) / (1000 * 60 * 60 * 24));
      return { ...p, isNew: daysDiff <= 7, daysSinceEntry: daysDiff };
    }).sort((a, b) => {
      // Ordena por data de entrada (mais recente primeiro)
      const dateA = new Date(a.history[0].date).getTime();
      const dateB = new Date(b.history[0].date).getTime();
      return dateB - dateA;
    }).slice(0, 10); // Máximo 10 produtos
  }, [products, latestDate]);

  // Ajustes de Preço (últimos 7 dias)
  const priceAdjustments = useMemo(() => {
    if (!latestDate) return [] as Array<{
      id: string;
      name: string;
      url?: string;
      oldPrice: number;
      newPrice: number;
      pct: number;
      direction: 'UP' | 'DOWN';
      changeDate: string;
      currentStock: number;
    }>;

    const end = new Date(latestDate);
    const start = new Date(end);
    start.setDate(end.getDate() - 7);
    const startStr = start.toISOString().slice(0, 10);

    const list: Array<{
      id: string;
      name: string;
      url?: string;
      oldPrice: number;
      newPrice: number;
      pct: number;
      direction: 'UP' | 'DOWN';
      changeDate: string;
      currentStock: number;
    }> = [];

    for (const p of products) {
      const hist = (p.history || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
      // Coleta snapshots dentro da janela de 7 dias (considera datas ISO ou YYYY-MM-DD)
      const inWindow = hist.filter(h => String(h.date).slice(0, 10) >= startStr);

      // Preço novo: usa o preço atual do produto se válido, senão último da janela
      const newPrice = Number.isFinite(p.price) && p.price > 0
        ? p.price
        : (inWindow.length ? (inWindow[inWindow.length - 1].price || 0) : 0);

      // Preço antigo: primeiro preço válido dentro da janela (ou ignora se 0)
      let oldPrice = 0;
      let oldPriceDate = '';
      for (const snap of inWindow) {
        if ((snap.price || 0) > 0) {
          oldPrice = snap.price as number;
          oldPriceDate = String(snap.date).slice(0, 10);
          break;
        }
      }

      if (oldPrice > 0 && newPrice > 0 && newPrice !== oldPrice) {
        const pct = ((newPrice - oldPrice) / oldPrice) * 100;
        list.push({
          id: p.id,
          name: p.name,
          url: p.url,
          oldPrice,
          newPrice,
          pct: Math.round(pct * 10) / 10,
          direction: pct > 0 ? 'UP' : 'DOWN',
          changeDate: oldPriceDate || String(end.toISOString().slice(0, 10)),
          currentStock: p.currentStock
        });
      }
    }

    // Ordena por variação absoluta (maior impacto primeiro) e limita
    return list.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, 15);
  }, [products, latestDate]);

  // Process data to calculate derived metrics (Sales, Status)
  const processedData = useMemo(() => {
    const analysis: (ProductAnalysis & { sales7d: number, sales15d: number, sales30d: number })[] = products.map(p => {

      const sales24h = calculateSales(p, 1);
      const sales7d = calculateSales(p, 7);
      const sales15d = calculateSales(p, 15);
      const sales30d = calculateSales(p, 30);

      let stockStatus: 'OK' | 'LOW' | 'CRITICAL' = 'OK';

      // Use the Custom Threshold from state for the status check
      if (p.currentStock === 0) stockStatus = 'CRITICAL';
      else if (p.currentStock <= customThreshold) stockStatus = 'LOW';

      // Determine Trend
      // Compare last 24h sales vs previous 24h
      const h = p.history;
      const todayIndex = h.length - 1;
      const prevSales = Math.max(0, (h[todayIndex - 2]?.quantity || 0) - (h[todayIndex - 1]?.quantity || 0));

      let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
      if (sales24h > Math.max(0, prevSales)) trend = 'UP';
      else if (sales24h < Math.max(0, prevSales)) trend = 'DOWN';

      return {
        productId: p.id,
        name: p.name,
        salesLast24h: sales24h,
        // usamos prevSales calculado para comparação por produto
        prevSalesLast24h: prevSales,
        sales7d,
        sales15d,
        sales30d,
        stockStatus,
        trend
      };
    });

    return analysis;
  }, [products, customThreshold]);

  // Dashboard Aggregates
  const metrics = useMemo(() => {
    const getYesterdayStock = (p: Product) => {
      const h = p.history;
      const idx = h.length - 2;
      return idx >= 0 ? h[idx].quantity : p.currentStock;
    };

    const totalProducts = products.length;
    const lowStockCount = processedData.filter(d => d.stockStatus !== 'OK').length;
    const totalUnits = products.reduce((acc, curr) => acc + curr.currentStock, 0);
    const totalUnitsYesterday = products.reduce((acc, curr) => acc + getYesterdayStock(curr), 0);
    const totalProductsYesterday = products.filter(p => p.history.length >= 2).length || totalProducts;
    const lowStockCountYesterday = products.reduce((acc, p) => {
      const y = getYesterdayStock(p);
      return acc + (y === 0 ? 1 : y <= customThreshold ? 1 : 0);
    }, 0);
    const totalSales24h = processedData.reduce((acc, curr) => acc + curr.salesLast24h, 0);
    // Soma das vendas das últimas 24h anteriores (ontem)
    const totalPrevSales24h = processedData.reduce((acc, curr: any) => acc + (curr.prevSalesLast24h || 0), 0);
    return { totalProducts, lowStockCount, totalUnits, totalUnitsYesterday, totalProductsYesterday, lowStockCountYesterday, totalSales24h, totalPrevSales24h };
  }, [products, processedData, customThreshold]);

  // Top Sellers Data
  const topSellers = useMemo(() => {
    return [...processedData]
      .sort((a, b) => {
        const valA = topSellersRange === '24h' ? a.salesLast24h :
          topSellersRange === '7d' ? a.sales7d :
            topSellersRange === '15d' ? a.sales15d : a.sales30d;
        const valB = topSellersRange === '24h' ? b.salesLast24h :
          topSellersRange === '7d' ? b.sales7d :
            topSellersRange === '15d' ? b.sales15d : b.sales30d;
        return valB - valA;
      })
      .slice(0, 15);
  }, [processedData, topSellersRange]);

  // Handle Sorting Click
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  // Rendering Sort Icon
  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortKey !== colKey) return <ArrowUpDown size={14} className="text-gray-300 ml-1 inline" />;
    return sortDirection === 'asc'
      ? <ArrowUp size={14} className="text-indigo-600 ml-1 inline" />
      : <ArrowDown size={14} className="text-indigo-600 ml-1 inline" />;
  };

  // Produtos com estoque baixo (≤ 2) - para banner de alerta
  const lowStockAlertProducts = useMemo(() => {
    return products
      .filter(p => p.currentStock > 0 && p.currentStock <= 2)
      .sort((a, b) => a.currentStock - b.currentStock) // Ordena: menor estoque primeiro
      .slice(0, 20); // Máximo 20 produtos no alerta
  }, [products]);

  // Filtering and Sorting logic for the table
  const tableData = useMemo(() => {
    let data = [...products];

    // 0. Remover produtos zerados após 3 dias
    // Produtos zerados aparecem na lista por 3 dias, depois são removidos
    data = data.filter(p => {
      if (p.currentStock > 0) return true; // Produtos com estoque sempre aparecem

      // Para produtos zerados, verificar quando zeraram
      const history = p.history || [];
      if (history.length < 2) return true; // Se não tem histórico, manter

      // Encontrar quando o produto zerou
      let zeroDate: string | null = null;
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].quantity === 0) {
          zeroDate = history[i].date;
        } else {
          break; // Parar no primeiro registro não-zero de trás pra frente
        }
      }

      if (!zeroDate) return true; // Se não encontrou quando zerou, manter

      // Calcular dias desde que zerou
      const zeroDateTime = new Date(zeroDate).getTime();
      const today = new Date().getTime();
      const daysSinceZero = Math.floor((today - zeroDateTime) / (1000 * 60 * 60 * 24));

      return daysSinceZero <= 3; // Manter por 3 dias
    });

    // 1. Text Search
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter(p =>
        p.name.toLowerCase().includes(lowerTerm) ||
        p.category.toLowerCase().includes(lowerTerm)
      );
    }

    // 2.1 Sold filter by selected range (24h/7d/15d/30d)
    if (soldRange) {
      const pickSales = (a: any) => soldRange === '24h' ? a.salesLast24h : soldRange === '7d' ? a.sales7d : soldRange === '15d' ? a.sales15d : a.sales30d;
      const soldIds = new Set(
        processedData.filter(a => (pickSales(a) || 0) > 0).map(a => a.productId)
      );
      data = data.filter(p => soldIds.has(p.id));
    }

    // 2. Status Filter
    if (statusFilter === 'LOW_CRITICAL') {
      data = data.filter(p => {
        const analysis = processedData.find(a => a.productId === p.id);
        return analysis?.stockStatus === 'LOW' || analysis?.stockStatus === 'CRITICAL';
      });
    } else if (statusFilter === 'NORMAL') {
      data = data.filter(p => {
        const analysis = processedData.find(a => a.productId === p.id);
        return analysis?.stockStatus === 'OK';
      });
    }

    // 3. Sorting
    data.sort((a, b) => {
      const analysisA = processedData.find(x => x.productId === a.id);
      const analysisB = processedData.find(x => x.productId === b.id);

      let valA: any = '';
      let valB: any = '';

      switch (sortKey) {
        case 'name':
          valA = a.name;
          valB = b.name;
          break;
        case 'stock':
          valA = a.currentStock;
          valB = b.currentStock;
          break;
        case 'sales':
          valA = analysisA?.salesLast24h || 0;
          valB = analysisB?.salesLast24h || 0;
          break;
        case 'status':
          const weight = (s?: string) => s === 'CRITICAL' ? 0 : s === 'LOW' ? 1 : 2;
          valA = weight(analysisA?.stockStatus);
          valB = weight(analysisB?.stockStatus);
          break;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [products, processedData, searchTerm, sortKey, sortDirection, statusFilter]);

  // Função para reiniciar os servidores
  const handleRestart = async () => {
    if (isRestarting) return;

    if (!confirm('Deseja reiniciar os servidores? A página será recarregada em alguns segundos.')) {
      return;
    }

    setIsRestarting(true);
    try {
      await fetch('/api/restart', { method: 'POST' });
      // Aguarda 5 segundos para os servidores reiniciarem
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    } catch (e) {
      setIsRestarting(false);
      alert('Erro ao reiniciar servidores. Tente executar .\\start.ps1 manualmente.');
    }
  };

  // Função reutilizável de carregamento (hoje ou todos) com retry programado
  const fetchInventory = async (mode: 'today' | 'all', isRetry = false) => {
    // Evita múltiplas chamadas simultâneas
    if (isLoadingInventory) return;

    setIsLoadingInventory(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const url = mode === 'today' ? '/api/inventory?today=1' : '/api/inventory';
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok) throw new Error(`Falha ao consultar ${url} (status ${resp.status})`);
      const json = await resp.json();
      if (Array.isArray(json.products) && json.products.length > 0) {
        setProducts(json.products as Product[]);
        setFilterDate(json.filterDate || null);
        setAutoLoaded(true);
        setAutoLoadError('');
      } else {
        setAutoLoadError('API respondeu sem dados de produtos.');
      }
    } catch (e: any) {
      setAutoLoadError(e?.name === 'AbortError' ? 'Tempo de resposta excedido.' : (e.message || 'Erro ao carregar inventário backend.'));
      if (!isRetry && loadAttempts < 5) {
        const backoff = Math.min(8000, 1000 + loadAttempts * 1000);
        setTimeout(() => setLoadAttempts(a => a + 1), backoff);
      }
    } finally {
      setIsLoadingInventory(false);
    }
  };

  // Efeito inicial + retentativas (com limite de tentativas)
  useEffect(() => {
    let isMounted = true;

    if (!autoLoaded && loadAttempts < 5) {
      // Usar timeout para evitar race conditions com StrictMode
      const timer = setTimeout(() => {
        if (isMounted && !autoLoaded) {
          fetchInventory('today', true);
        }
      }, 100);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAttempts, autoLoaded]);

  // Persist preferences locally
  useEffect(() => {
    try { localStorage.setItem('showTopViewButton', showTopViewButton ? '1' : '0'); } catch { }
  }, [showTopViewButton]);
  useEffect(() => {
    try { localStorage.setItem('viewButtonPromptSeen', viewButtonPromptSeen ? '1' : '0'); } catch { }
  }, [viewButtonPromptSeen]);
  useEffect(() => {
    try { localStorage.setItem('showDebugPanel', showDebugPanel ? '1' : '0'); } catch { }
  }, [showDebugPanel]);
  // Render
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Controle de Estoque</h1>
          {autoLoadError ? (
            <p className="font-semibold text-red-600">Não foi possível carregar dados da planilha.</p>
          ) : (
            !autoLoaded && <p className="font-semibold text-indigo-600">Carregando inventário da planilha...</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDebugPanel(v => !v)}
            className={`px-3 py-2 rounded-lg font-medium border transition-colors ${showDebugPanel ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
            title="Mostrar/Ocultar painel de debug"
          >
            Debug {showDebugPanel ? 'On' : 'Off'}
          </button>
          <button
            onClick={handleRestart}
            disabled={isRestarting}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${isRestarting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            title="Reinicia os servidores backend e frontend"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
            {isRestarting ? 'Reiniciando...' : 'Atualizar Servidores'}
          </button>
        </div>
      </header>

      {/* Banner de loading / erro */}
      {!autoLoaded && (
        <div className={`mb-6 p-4 rounded-lg border text-sm flex flex-col gap-3 ${autoLoadError ? 'border-yellow-200 bg-yellow-50 text-yellow-800' : 'border-indigo-200 bg-indigo-50 text-indigo-800'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-[11px] opacity-70 font-mono">Tentativas: {loadAttempts} {isLoadingInventory ? '(consultando...)' : ''}</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fetchInventory('today')}
                className="px-2 py-1 rounded text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700"
                disabled={isLoadingInventory}
              >Hoje</button>
              <button
                type="button"
                onClick={() => fetchInventory('all')}
                className="px-2 py-1 rounded text-xs font-medium bg-gray-800 text-white hover:bg-gray-900"
                disabled={isLoadingInventory}
              >Todos</button>
              <button
                type="button"
                onClick={() => setLoadAttempts(a => a + 1)}
                className="px-2 py-1 rounded text-xs font-medium bg-white border border-gray-300 hover:bg-gray-100"
                disabled={isLoadingInventory}
              >Retry</button>
            </div>
          </div>
          {autoLoadError && (
            <div className="flex items-start gap-2 text-red-700">
              <AlertTriangle size={16} className="mt-0.5" />
              <span>{autoLoadError}</span>
            </div>
          )}
        </div>
      )}

      {/* 🚨 BANNER DE ALERTA: Estoque Baixo (≤ 2 unidades) */}
      {lowStockAlertProducts.length > 0 && (
        <div className="mb-6 bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 border-2 border-red-300 rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 bg-red-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle size={28} className="animate-bounce" />
              <div>
                <h3 className="text-xl font-bold animate-pulse">⚠️ ALERTA: Estoque Crítico</h3>
                <p className="text-sm text-red-100">
                  {lowStockAlertProducts.filter(p => p.currentStock === 0).length > 0 && `${lowStockAlertProducts.filter(p => p.currentStock === 0).length} ZERADO(S) • `}
                  {lowStockAlertProducts.length} produto(s) com ≤ 2 unidades
                </p>
              </div>
            </div>
            <button
              onClick={() => setStatusFilter('LOW_CRITICAL')}
              className="px-4 py-2 bg-white text-red-600 rounded-lg font-bold hover:bg-red-50 transition-colors"
            >
              Ver na Tabela
            </button>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {lowStockAlertProducts.map((product) => {
                const isZero = product.currentStock === 0;
                const isOne = product.currentStock === 1;
                const bgColor = isZero ? 'bg-red-100 border-red-400' : isOne ? 'bg-orange-100 border-orange-400' : 'bg-yellow-100 border-yellow-400';
                const textColor = isZero ? 'text-red-900' : isOne ? 'text-orange-900' : 'text-yellow-900';
                const badgeColor = isZero ? 'bg-red-600 text-white' : isOne ? 'bg-orange-600 text-white' : 'bg-yellow-600 text-white';
                const icon = isZero ? '🔴' : isOne ? '🟠' : '🟡';

                return (
                  <div key={`alert-${product.id}`} className={`p-3 rounded-lg border-2 ${bgColor} ${textColor} shadow-sm hover:shadow-md transition-all`}>
                    <div className="flex items-start justify-between mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-black ${badgeColor} flex items-center gap-1`}>
                        {icon} {isZero ? 'ZERADO' : `${product.currentStock} UNID`}
                      </span>
                      {isZero && (
                        <span className="text-xs font-bold">❗</span>
                      )}
                    </div>
                    {product.url ? (
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block font-bold text-sm hover:underline line-clamp-2 mb-2 ${textColor}`}
                        title={product.name}
                      >
                        {product.name}
                      </a>
                    ) : (
                      <p className="font-bold text-sm line-clamp-2 mb-2" title={product.name}>
                        {product.name}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="opacity-75">{product.category}</span>
                      {product.price > 0 && (
                        <span className="font-mono font-bold">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                        </span>
                      )}
                    </div>
                    {(() => {
                      const analysis = processedData.find(a => a.productId === product.id);
                      const sales = analysis?.salesLast24h || 0;
                      if (sales > 0) {
                        return (
                          <div className="mt-2 pt-2 border-t border-current opacity-60 text-xs font-semibold flex items-center gap-1">
                            <TrendingDown size={12} />
                            <span>{sales} vendido(s) em 24h</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="px-4 py-2 bg-red-100 border-t border-red-200 text-center">
            <p className="text-xs text-red-700 font-semibold">
              💡 Produtos zerados foram removidos da tabela principal e aparecem apenas aqui
            </p>
          </div>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="SKUs Ativos"
          value={metrics.totalProducts}
          icon={Package}
          color="blue"
          subtext="Produtos cadastrados"
          compareToday={metrics.totalProducts}
          compareYesterday={metrics.totalProductsYesterday}
          onClick={() => setStatusFilter('ALL')}
          isActive={statusFilter === 'ALL'}
        />
        <StatsCard
          title="Total de Unidades"
          value={metrics.totalUnits}
          icon={Layers}
          color="yellow"
          subtext="Soma de itens em estoque"
          compareToday={metrics.totalUnits}
          compareYesterday={metrics.totalUnitsYesterday}
        />
        <StatsCard
          title="Alertas de Baixo Estoque"
          value={metrics.lowStockCount}
          icon={AlertTriangle}
          color="red"
          subtext={`Abaixo de ${customThreshold} unid.`}
          compareToday={metrics.lowStockCount}
          compareYesterday={metrics.lowStockCountYesterday}
          onClick={() => setStatusFilter('LOW_CRITICAL')}
          isActive={statusFilter === 'LOW_CRITICAL'}
        />
        <StatsCard
          title="Itens Vendidos (24h)"
          value={metrics.totalSales24h}
          icon={ArrowUp}
          color="green"
          subtext="Hoje vs Ontem"
          compareToday={metrics.totalSales24h}
          compareYesterday={metrics.totalPrevSales24h}
          onClick={() => {
            if (topSellersRange !== '24h') {
              setTopSellersRange('24h');
              setSoldRange('24h');
            } else {
              setSoldRange(prev => prev === '24h' ? null : '24h');
            }
          }}
          isActive={soldRange === '24h'}
        />
      </div>

      {/* Novos SKUs - Logo após os cards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="p-4 border-b border-gray-100 bg-emerald-50 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-2xl">🆕</span>
            Novos SKUs Detectados
          </h3>
          <span className="px-3 py-1 rounded-full text-sm font-bold bg-emerald-600 text-white">{newProducts.length} novo(s)</span>
        </div>
        {newProducts.length > 0 ? (
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {newProducts.map((p, idx) => {
                const isNew = (p as any).isNew;
                const daysSince = (p as any).daysSinceEntry;
                return (
                  <div key={`new-${p.id}`} className={`p-3 border-2 rounded-lg hover:shadow-md transition-all group ${isNew ? 'border-emerald-300 bg-emerald-50/30' : 'border-red-300 bg-red-50/30'}`}>
                    <div className="flex flex-col gap-2">
                      {/* Tag de status */}
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isNew ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                          {isNew ? '🆕 NOVO' : '⏰ MAIS DE 1 SEMANA'}
                        </span>
                        <span className="text-[10px] text-gray-500">{daysSince}d</span>
                      </div>
                      {/* Nome com numeração no início */}
                      {p.url ? (
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 line-clamp-2 group-hover:underline" title={p.name}>
                          <span className={`${isNew ? 'text-emerald-600' : 'text-red-600'}`}>#{idx + 1}</span> {p.name}
                        </a>
                      ) : (
                        <span className="text-sm font-semibold text-gray-900 line-clamp-2" title={p.name}>
                          <span className={`${isNew ? 'text-emerald-600' : 'text-red-600'}`}>#{idx + 1}</span> {p.name}
                        </span>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-gray-600">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700" title="Dia de entrada">
                          {(() => {
                            const raw = p.history?.[0]?.date || p.captureDate || '';
                            const fmt = raw ? `${raw.slice(8, 10)}-${raw.slice(5, 7)}-${raw.slice(0, 4)}` : 'N/A';
                            return `Entrada: ${fmt}`;
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{p.category}</span>
                        <span className="font-mono font-bold text-emerald-600" title="Estoque atual">Estoque = {p.currentStock} unid.</span>
                      </div>
                      {p.price > 0 && (
                        <div className="text-xs text-gray-600 font-semibold">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">
            <p className="text-sm">Nenhum produto novo detectado no último dia de coleta.</p>
            <p className="text-xs mt-1">Novos SKUs aparecem quando há primeiro registro na data mais recente.</p>
          </div>
        )}
      </div>

      {/* Alteração de Preço (últimos 7 dias) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="p-4 border-b border-gray-100 bg-indigo-50 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-2xl">💱</span>
            Alteração de Preço (7 dias)
          </h3>
          <span className="px-3 py-1 rounded-full text-sm font-bold bg-indigo-600 text-white">{priceAdjustments.length} novos</span>
        </div>
        {priceAdjustments.length > 0 ? (
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {priceAdjustments.map((it, idx) => (
                <div key={`pa-${it.id}`} className="p-3 border rounded-lg hover:shadow-md transition-all bg-white border-gray-200">
                  <div className="flex items-start justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${it.direction === 'UP' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>#{idx + 1} • {it.direction === 'UP' ? 'Subiu' : 'Baixou'}</span>
                    <span className="text-[10px] text-gray-500">
                      {(() => {
                        const raw = it.changeDate || '';
                        return raw ? `${raw.slice(8, 10)}-${raw.slice(5, 7)}-${raw.slice(0, 4)}` : '—';
                      })()}
                    </span>
                  </div>
                  {it.url ? (
                    <a href={it.url} target="_blank" rel="noopener noreferrer" className="block mt-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900 line-clamp-2 hover:underline" title={it.name}>{it.name}</a>
                  ) : (
                    <span className="block mt-2 text-sm font-semibold text-gray-900 line-clamp-2" title={it.name}>{it.name}</span>
                  )}
                  <div className="mt-2 text-xs text-gray-600 flex items-center justify-between">
                    <span className="font-mono">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(it.oldPrice)}
                    </span>
                    <span className="mx-2">→</span>
                    <span className="font-mono font-semibold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(it.newPrice)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-bold flex items-center gap-1">
                    {it.direction === 'UP' ? (
                      <ArrowUp size={14} className="text-red-600" />
                    ) : (
                      <ArrowDown size={14} className="text-emerald-600" />
                    )}
                    <span className={it.direction === 'UP' ? 'text-red-700' : 'text-emerald-700'}>
                      {it.pct > 0 ? '+' : ''}{it.pct}%
                    </span>
                    <span className="ml-auto text-[11px] text-gray-600 font-mono font-semibold" title="Estoque atual">Estoque = {it.currentStock} unid.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">
            <p className="text-sm">Nenhuma alteração de preço detectada nos últimos 7 dias.</p>
          </div>
        )}
      </div>

      {/* Área Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Esquerda */}
        <div className="lg:col-span-2 space-y-6">
          {(showDebugPanel || !autoLoaded || new URLSearchParams(window.location.search).get('debug') === '1') && (
            <InventoryDebug refStart={chartPeriod.start} refEnd={chartPeriod.end} />
          )}

          {/* Tabela de Produtos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg text-gray-800">Inventário Detalhado</h3>
                  {filterDate ? (
                    <span className="px-2 py-1 rounded text-[10px] bg-indigo-100 text-indigo-700 font-semibold" title="Data filtrada">{filterDate}</span>
                  ) : (
                    autoLoaded && <span className="px-2 py-1 rounded text-[10px] bg-gray-200 text-gray-600 font-semibold" title="Sem filtro de data">Todos</span>
                  )}
                </div>
                <div className="flex items-center gap-3 bg-red-50 p-2 rounded-lg border border-red-100">
                  <span className="text-xs font-bold text-red-700 uppercase">Abaixo de:</span>
                  <input
                    type="number"
                    min="0"
                    value={customThreshold}
                    onChange={(e) => setCustomThreshold(Number(e.target.value))}
                    className="w-16 px-2 py-1 text-sm border border-red-200 rounded text-center text-red-800 font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <span className="text-xs text-red-600">unid.</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex gap-2 text-sm">
                  {soldRange && (
                    <span className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold text-xs flex items-center gap-1">
                      Vendidos ({soldRange})
                    </span>
                  )}
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3 py-1.5 rounded-full transition-colors border ${statusFilter === 'ALL' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  >
                    {filterDate ? 'Filtrados' : 'Todos'}
                  </button>
                  <button
                    onClick={() => setStatusFilter('LOW_CRITICAL')}
                    className={`px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors border ${statusFilter === 'LOW_CRITICAL' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-600 border-red-200 hover:bg-red-50'}`}
                  >
                    <AlertTriangle size={14} /> Críticos ({"<"}{customThreshold})
                  </button>
                  <button
                    onClick={() => setStatusFilter('NORMAL')}
                    className={`px-3 py-1.5 rounded-full transition-colors border ${statusFilter === 'NORMAL' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}
                  >
                    Normal
                  </button>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar produto..."
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left border-collapse relative">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="p-4 text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>Status <SortIcon colKey="status" /></th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>Produto <SortIcon colKey="name" /></th>
                    <th className="p-4 text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('stock')}>Estoque <SortIcon colKey="stock" /></th>
                    <th className="p-4 text-center">Preço</th>
                    <th className="p-4 text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('sales')}>Vendas (24h) <SortIcon colKey="sales" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tableData.map(product => {
                    const analysis = processedData.find(a => a.productId === product.id);
                    const isLow = product.currentStock <= customThreshold;
                    const sales = analysis?.salesLast24h || 0;

                    // Calcular dias desde que zerou
                    let daysSinceZero: number | null = null;
                    if (product.currentStock === 0) {
                      const history = product.history || [];
                      if (history.length >= 2) {
                        // Procurar do mais antigo para o mais recente para encontrar quando zerou
                        let firstZeroDate: string | null = null;
                        for (let i = 0; i < history.length; i++) {
                          if (history[i].quantity === 0) {
                            firstZeroDate = history[i].date;
                            break; // Encontrou a primeira data com estoque zero
                          }
                        }

                        if (firstZeroDate) {
                          const zeroDateTime = new Date(firstZeroDate).getTime();
                          const today = new Date().getTime();
                          daysSinceZero = Math.floor((today - zeroDateTime) / (1000 * 60 * 60 * 24));
                        }
                      }
                    }

                    return (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="p-4 text-center">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 animate-pulse">
                              <AlertTriangle size={12} /> Baixo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-600">OK</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {product.url ? (
                              <a href={product.url} target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:text-indigo-900 underline underline-offset-2">
                                {product.name}
                              </a>
                            ) : (
                              <span className="text-gray-900 group-hover:text-indigo-600 transition-colors">{product.name}</span>
                            )}
                            {newProducts.some(np => np.id === product.id) && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700" title="Produto novo no último dia">
                                Novo
                              </span>
                            )}
                            {daysSinceZero !== null && daysSinceZero >= 1 && daysSinceZero <= 3 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white animate-pulse" title={`Produto zerou há ${daysSinceZero} dia(s)`}>
                                {daysSinceZero} dia{daysSinceZero > 1 ? 's' : ''} que acabou
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">{product.category}</div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`font-mono text-base ${isLow ? 'text-red-600' : 'text-gray-800'}`}>{product.currentStock}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-mono text-base text-gray-800">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {(() => {
                            const prev = analysis?.prevSalesLast24h || 0;
                            const down = sales < prev;
                            const delta = sales - prev;
                            const tooltip = `Hoje: ${sales} | Ontem: ${prev} | Δ ${delta >= 0 ? "+" + delta : delta}`;
                            return (
                              <div className="flex items-center justify-center gap-1" title={tooltip}>
                                {down && <ArrowDown size={14} className="text-red-600" />}
                                <span className="font-mono text-base text-gray-800">{sales}</span>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {tableData.length === 0 && (
                <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-3">
                  <Filter size={48} className="text-gray-200" />
                  <p>Nenhum produto encontrado com os filtros atuais.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setStatusFilter('ALL')} className="text-indigo-600 text-sm font-medium hover:underline">Limpar status</button>
                    {soldRange && (
                      <button onClick={() => setSoldRange(null)} className="text-emerald-600 text-sm font-medium hover:underline">Limpar vendidos</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coluna Direita */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Award className="text-indigo-600" size={20} />
                Top Vendas
              </h3>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 gap-2 px-2">
              <div className="flex flex-1">
                {(['24h', '7d', '15d', '30d'] as TimeRange[]).map(range => (
                  <button
                    key={range}
                    onClick={() => { setTopSellersRange(range); setSoldRange(prev => prev === range ? null : range); }}
                    title="Clique para filtrar a tabela por vendidos neste período"
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${topSellersRange === range ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                  >
                    {range}
                  </button>
                ))}
              </div>
              {showTopViewButton && (
                <div className="py-2 pr-2">
                  <button
                    onClick={() => setSoldRange(prev => prev === topSellersRange ? null : topSellersRange)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide border transition-colors ${soldRange === topSellersRange ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'}`}
                    title="Aplicar o período selecionado na tabela principal"
                  >
                    Ver na tabela
                  </button>
                </div>
              )}
            </div>
            {!viewButtonPromptSeen && (
              <div className="px-3 py-2 bg-amber-50 text-amber-700 text-[11px] flex items-center justify-between border-b border-amber-100">
                <span>Novo: botão "Ver na tabela" para aplicar o período nos resultados.</span>
                <div className="flex gap-2">
                  <button onClick={() => setViewButtonPromptSeen(true)} className="px-2 py-1 rounded border border-amber-300 bg-white hover:bg-amber-100">Gostei</button>
                  <button onClick={() => { setShowTopViewButton(false); setViewButtonPromptSeen(true); }} className="px-2 py-1 rounded border border-amber-300 bg-white hover:bg-amber-100">Voltar</button>
                </div>
              </div>
            )}
            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
              {topSellers.map((item, index) => {
                const salesCount = topSellersRange === '24h' ? item.salesLast24h : topSellersRange === '7d' ? item.sales7d : topSellersRange === '15d' ? item.sales15d : item.sales30d;
                if (salesCount === 0) return null;
                return (
                  <div key={`top-${item.productId}`} className="p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 flex items-center justify-center">
                      {index === 0 && (
                        <span title="#1" className="w-8 h-8 rounded-full flex items-center justify-center bg-yellow-200 text-yellow-800 shadow-sm">
                          🥇
                        </span>
                      )}
                      {index === 1 && (
                        <span title="#2" className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-300 text-gray-700 shadow-sm">
                          🥈
                        </span>
                      )}
                      {index === 2 && (
                        <span title="#3" className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-300 text-amber-800 shadow-sm">
                          🥉
                        </span>
                      )}
                      {index > 2 && (
                        <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-gray-100 text-gray-500">#{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate" title={item.name}>{item.name}</p>
                      <p className="text-xs text-gray-500">Estoque atual: {products.find(p => p.id === item.productId)?.currentStock}</p>
                    </div>
                    <div className="text-right">
                      <span className="block font-bold text-indigo-600">{salesCount}</span>
                      <span className="text-[10px] text-gray-400 uppercase">Vendidos</span>
                    </div>
                  </div>
                );
              })}
              {topSellers.length === 0 || topSellers.every(i => (topSellersRange === '24h' ? i.salesLast24h : i.sales30d) === 0) ? (
                <div className="p-8 text-center text-gray-400 text-sm">Sem dados de vendas para este período.</div>
              ) : null}
            </div>
            <div className="p-2 bg-gray-50 border-t border-gray-100 text-center">
              <span className="text-[10px] text-gray-400 font-medium">Exibindo os top 15</span>
            </div>
          </div>
          <StockChart products={products} onPeriodChange={handlePeriodChange} />
        </div>
      </div>

      {/* Análise Inteligente - Seção Inferior */}
      <div className="mt-8">
        <GeminiInsight analysisData={processedData} />
      </div>
    </div>
  );
};

export default App;