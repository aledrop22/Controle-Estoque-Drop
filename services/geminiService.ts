import { GoogleGenAI } from "@google/genai";
import { ProductAnalysis } from '../src/types';

// Recupera chave via variáveis Vite (prefixo VITE_) em tempo de build
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

export const analyzeInventory = async (products: ProductAnalysis[]) => {
  if (!apiKey) {
    console.warn("API Key ausente: defina VITE_GEMINI_API_KEY em .env");
    return "A chave da API Gemini não foi configurada (VITE_GEMINI_API_KEY). Configure-a no arquivo .env para gerar insights.";
  }

  const criticalItems = products.filter(p => p.stockStatus === 'CRITICAL');
  const lowItems = products.filter(p => p.stockStatus === 'LOW');
  const highSalesItems = products.filter(p => p.salesLast24h > 5).sort((a, b) => b.salesLast24h - a.salesLast24h);

  const prompt = `
    Você é um especialista em logística e gestão de estoque.
    Analise os seguintes dados de um e-commerce e forneça um resumo executivo curto e acionável (máximo 4 parágrafos) em Português.
    Use formatação Markdown simples (negrito, tópicos).

    Contexto de Dados:
    - Total de produtos analisados: ${products.length}
    - Produtos Críticos (Estoque muito baixo): ${criticalItems.map(i => `${i.name} (Restante: ${products.find(p => p.productId === i.productId)?.stockStatus})`).join(', ')}
    - Produtos em Alerta (Baixo estoque): ${lowItems.length} itens.
    - Top Vendas (Últimas 24h): ${highSalesItems.slice(0, 3).map(i => `${i.name} (${i.salesLast24h} vendidos)`).join(', ')}.

    O que comentar:
    1. Ações imediatas de reposição necessárias.
    2. Identificação de produtos com alta rotatividade (Curva A).
    3. Sugestão geral para o gestor.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    // Algumas versões retornam objeto com propriedade 'text' ou método; mantemos compatibilidade
    return (response as any).text || (response as any)?.outputText || 'Sem resposta gerada.';
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Houve um erro ao analisar os dados com a IA. Tente novamente mais tarde.";
  }
};

// Função simples para testar se a chave funciona e o modelo responde
export const testGeminiKey = async (): Promise<{ ok: boolean; message: string }> => {
  if (!apiKey) {
    return { ok: false, message: 'Variável VITE_GEMINI_API_KEY ausente. Defina em .env.' };
  }
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Responda apenas com OK.'
    });
    const text = (response as any).text || (response as any)?.outputText || '';
    if (/ok/i.test(text)) {
      return { ok: true, message: 'Chave válida. Conexão com Gemini OK.' };
    }
    return { ok: false, message: 'Resposta inesperada do modelo: ' + text };
  } catch (e: any) {
    console.error('Erro ao testar chave Gemini:', e);
    return { ok: false, message: 'Falha ao conectar: ' + (e?.message || 'Erro desconhecido') };
  }
};
