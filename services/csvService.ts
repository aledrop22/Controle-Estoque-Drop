import { Product } from '../src/types';
import { generateHistory } from '../src/constants';

// Expected CSV Headers: id, name, category, price, currentStock, sales24h (optional)

export const parseCSV = (csvText: string): Product[] => {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  const products: Product[] = [];

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i];
    // Handle simplistic CSV splitting (avoids complex regex for demo, assuming simple data)
    const values = currentLine.split(',').map(v => v.trim().replace(/"/g, ''));

    if (values.length < 5) continue;

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });

    // Map CSV columns to Product Interface
    // We try to match standard keys, or fallback to index positions if keys don't match exactly
    const stock = parseInt(row.currentStock || values[4] || '0');
    const price = parseFloat(row.price || values[3] || '0');
    const id = row.id || values[0] || `CSV-${i}`;
    const name = row.name || values[1] || 'Produto Sem Nome';
    const category = row.category || values[2] || 'Geral';

    // Optional: If the sheet provides yesterday's sales explicitly
    const providedSales24h = row.sales24h ? parseInt(row.sales24h) : null;

    // Generate simulated history for the chart based on current stock
    // In a real scenario with historical DB, we wouldn't generate this.
    // However, since the user imports a Snapshot, we fake the "past" for UI visualization
    // unless sales24h is provided to make it more accurate.
    const volatility = stock < 10 ? 'HIGH' : 'LOW';
    let history = generateHistory(stock, volatility);

    // If the CSV has a 'sales24h' column, we adjust the immediate history to match it
    if (providedSales24h !== null) {
      // Index last is today, Index last-1 is yesterday
      // We adjust yesterday's stock to be: todayStock + sales24h
      if (history.length >= 2) {
        history[history.length - 2].quantity = stock + providedSales24h;
      }
    }

    products.push({
      id,
      name,
      category,
      price,
      currentStock: stock,
      minStockThreshold: 10, // Default threshold, can be customized in UI
      history
    });
  }

  return products;
};

export const fetchGoogleSheetData = async (url: string): Promise<Product[]> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Falha ao buscar planilha");
    const text = await response.text();
    return parseCSV(text);
  } catch (error) {
    console.error("Erro ao carregar planilha:", error);
    throw error;
  }
};