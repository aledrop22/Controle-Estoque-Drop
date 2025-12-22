import { Product } from './types';

// Helper to generate dates
const getPastDate = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

// Helper para gerar histórico customizado com data específica de zeramento
const generateZeroHistory = (daysAgoZeroed: number): { date: string, quantity: number }[] => {
  const history = [];

  // Hoje: estoque 0
  history.push({ date: getPastDate(0), quantity: 0 });

  // Dias desde que zerou até hoje: mantém 0
  for (let i = 1; i < daysAgoZeroed; i++) {
    history.push({ date: getPastDate(i), quantity: 0 });
  }

  // Dia que zerou: ainda tinha 1
  history.push({ date: getPastDate(daysAgoZeroed), quantity: 1 });

  // Antes de zerar: tinha estoque normal
  let stock = 5;
  for (let i = daysAgoZeroed + 1; i <= 30; i++) {
    stock += Math.floor(Math.random() * 3);
    history.push({ date: getPastDate(i), quantity: stock });
  }

  return history.reverse();
};

export const generateHistory = (currentStock: number, volatility: 'HIGH' | 'LOW' | 'STABLE'): { date: string, quantity: number }[] => {
  const history = [];
  let quantity = currentStock;

  // Day 0 is current stock
  history.push({ date: getPastDate(0), quantity });

  // Generate 30 days back (increased from 6 to support 30-day analysis)
  for (let i = 1; i <= 30; i++) {
    const change = volatility === 'HIGH' ? Math.floor(Math.random() * 8) :
      volatility === 'LOW' ? Math.floor(Math.random() * 2) :
        Math.floor(Math.random() * 4); // Stable

    // Stock was higher in the past (sales happened)
    quantity += change;

    // Simulate generic restock logic to prevent numbers from going to infinity backwards
    // If quantity gets unrealistically high for a mock, dampen it slightly or random reset
    // This keeps the "past" stock realistic relative to current

    history.push({ date: getPastDate(i), quantity });
  }

  return history.reverse(); // Array should be sorted by date ascending for charts
};

// Generate more items
const CATEGORIES = ['Eletrônicos', 'Móveis', 'Acessórios', 'Periféricos', 'Casa', 'Escritório', 'Gamer', 'Rede'];

const MOCK_PRODUCTS_BASE: Partial<Product>[] = [
  // 🚨 PRODUTOS PARA DEMONSTRAÇÃO DO BANNER DE ALERTA (ESTOQUE BAIXO)
  { id: 'DEMO-001', name: '🔴 Mouse Gamer RGB Ultimate (ZERADO)', category: 'Periféricos', price: 199.90, currentStock: 0, minStockThreshold: 10, url: 'https://exemplo.com/mouse' },
  { id: 'DEMO-002', name: '🔴 Teclado Mecânico Pro RGB (ZERADO)', category: 'Periféricos', price: 459.00, currentStock: 0, minStockThreshold: 10, url: 'https://exemplo.com/teclado' },

  // 📅 PRODUTOS ZERADOS COM CONTAGEM DE DIAS
  { id: 'DEMO-ZERO-1', name: '📦 Webcam 4K Pro - Zerou ontem', category: 'Periféricos', price: 349.90, currentStock: 0, minStockThreshold: 10, url: 'https://exemplo.com/webcam' },
  { id: 'DEMO-ZERO-2', name: '📦 Microfone Profissional - Zerou há 2 dias', category: 'Periféricos', price: 489.00, currentStock: 0, minStockThreshold: 10 },
  { id: 'DEMO-ZERO-3', name: '📦 Mesa Digitalizadora XL - Zerou há 3 dias', category: 'Eletrônicos', price: 799.00, currentStock: 0, minStockThreshold: 5, url: 'https://exemplo.com/mesa' },

  { id: 'DEMO-003', name: '🟠 Headset Gamer Wireless Premium (1 UNIDADE)', category: 'Gamer', price: 599.00, currentStock: 1, minStockThreshold: 10, url: 'https://exemplo.com/headset' },
  { id: 'DEMO-004', name: '🟠 Monitor 144Hz 27" Curvo (1 UNIDADE)', category: 'Eletrônicos', price: 1299.00, currentStock: 1, minStockThreshold: 5 },
  { id: 'DEMO-005', name: '🟡 Cadeira Gamer Premium RGB (2 UNIDADES)', category: 'Móveis', price: 1499.00, currentStock: 2, minStockThreshold: 5, url: 'https://exemplo.com/cadeira' },
  { id: 'DEMO-006', name: '🟡 SSD NVMe 2TB Gen4 (2 UNIDADES)', category: 'Eletrônicos', price: 899.00, currentStock: 2, minStockThreshold: 10 },
  // PRODUTOS NORMAIS
  { id: 'PROD-001', name: 'Fone de Ouvido Bluetooth Pro', category: 'Eletrônicos', price: 150.00, currentStock: 8, minStockThreshold: 10 },
  { id: 'PROD-002', name: 'Cadeira Gamer Ergonomic', category: 'Móveis', price: 850.00, currentStock: 45, minStockThreshold: 5 },
  { id: 'PROD-003', name: 'Mousepad RGB Extra Grande', category: 'Acessórios', price: 45.90, currentStock: 25, minStockThreshold: 15 },
  { id: 'PROD-004', name: 'Monitor UltraWide 29"', category: 'Eletrônicos', price: 1200.00, currentStock: 12, minStockThreshold: 10 },
  { id: 'PROD-005', name: 'Teclado Mecânico Switch Blue', category: 'Periféricos', price: 220.00, currentStock: 50, minStockThreshold: 10 },
  { id: 'PROD-006', name: 'Suporte Notebook Alumínio', category: 'Acessórios', price: 89.90, currentStock: 105, minStockThreshold: 20 },
  { id: 'PROD-007', name: 'Webcam HD 1080p', category: 'Periféricos', price: 180.00, currentStock: 15, minStockThreshold: 8 },
  { id: 'PROD-008', name: 'Mesa Digitalizadora', category: 'Eletrônicos', price: 350.00, currentStock: 20, minStockThreshold: 5 },
  { id: 'PROD-009', name: 'Hub USB-C 7 em 1', category: 'Acessórios', price: 120.00, currentStock: 30, minStockThreshold: 10 },
  { id: 'PROD-010', name: 'Luminária de Mesa LED', category: 'Casa', price: 75.00, currentStock: 30, minStockThreshold: 10 },
  { id: 'PROD-011', name: 'Cabo HDMI 2.0 3m', category: 'Acessórios', price: 25.00, currentStock: 200, minStockThreshold: 50 },
  { id: 'PROD-012', name: 'SSD 1TB NVMe', category: 'Eletrônicos', price: 450.00, currentStock: 15, minStockThreshold: 10 },
  { id: 'PROD-013', name: 'Microfone Condensador USB', category: 'Periféricos', price: 280.00, currentStock: 18, minStockThreshold: 5 },
  { id: 'PROD-014', name: 'Ring Light 10"', category: 'Acessórios', price: 60.00, currentStock: 40, minStockThreshold: 15 },
  { id: 'PROD-015', name: 'Organizador de Cabos', category: 'Escritório', price: 15.00, currentStock: 300, minStockThreshold: 100 },
  { id: 'PROD-016', name: 'Roteador Wi-Fi 6 AX1800', category: 'Rede', price: 350.00, currentStock: 12, minStockThreshold: 5 },
  { id: 'PROD-017', name: 'Mouse Sem Fio Ergonômico', category: 'Periféricos', price: 90.00, currentStock: 60, minStockThreshold: 10 },
  { id: 'PROD-018', name: 'Headset Gamer 7.1', category: 'Gamer', price: 250.00, currentStock: 7, minStockThreshold: 10 },
  { id: 'PROD-019', name: 'Switch Ethernet 8 Portas', category: 'Rede', price: 110.00, currentStock: 25, minStockThreshold: 5 },
  { id: 'PROD-020', name: 'Placa de Captura 4K', category: 'Gamer', price: 600.00, currentStock: 4, minStockThreshold: 5 },
  { id: 'PROD-021', name: 'Impressora Multifuncional', category: 'Escritório', price: 900.00, currentStock: 3, minStockThreshold: 2 },
  { id: 'PROD-022', name: 'Calculadora Científica', category: 'Escritório', price: 45.00, currentStock: 50, minStockThreshold: 10 },
  { id: 'PROD-023', name: 'Filtro de Linha 6 Tomadas', category: 'Casa', price: 35.00, currentStock: 150, minStockThreshold: 30 },
  { id: 'PROD-024', name: 'Smart Lâmpada Wi-Fi', category: 'Casa', price: 55.00, currentStock: 80, minStockThreshold: 20 },
  { id: 'PROD-025', name: 'Case para HD Externo', category: 'Acessórios', price: 40.00, currentStock: 9, minStockThreshold: 10 },
];

export const MOCK_DATA: Product[] = MOCK_PRODUCTS_BASE.map(p => {
  // Produtos com histórico customizado de zeramento
  if (p.id === 'DEMO-ZERO-1') {
    return { ...p, history: generateZeroHistory(1) } as Product; // Zerou há 1 dia
  }
  if (p.id === 'DEMO-ZERO-2') {
    return { ...p, history: generateZeroHistory(2) } as Product; // Zerou há 2 dias
  }
  if (p.id === 'DEMO-ZERO-3') {
    return { ...p, history: generateZeroHistory(3) } as Product; // Zerou há 3 dias
  }

  // Produtos normais
  const volatility = p.currentStock! < 20 ? 'HIGH' : 'LOW';
  return {
    ...p,
    history: generateHistory(p.currentStock!, volatility)
  } as Product;
});