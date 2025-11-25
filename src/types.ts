
export interface DailySnapshot {
  date: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  currentStock: number;
  minStockThreshold: number;
  history: DailySnapshot[]; // Sorted by date ascending
}

export interface ProductAnalysis {
  productId: string;
  name: string;
  salesLast24h: number;
  stockStatus: 'OK' | 'LOW' | 'CRITICAL';
  trend: 'UP' | 'DOWN' | 'STABLE'; // Trend in stock level (Down means sales)
}

export interface DashboardMetrics {
  totalProducts: number; // SKU count
  totalUnits: number;    // Total physical items sum
  lowStockCount: number;
  totalSales24h: number; // Quantity of items sold in last 24h
}
