import React, { useEffect, useState } from 'react';
import { analyzeInventory, testGeminiKey } from '../services/geminiService';
import { ProductAnalysis } from '../src/types';
import { Sparkles, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface GeminiInsightProps {
  analysisData: ProductAnalysis[];
}

export const GeminiInsight: React.FC<GeminiInsightProps> = ({ analysisData }) => {
  const [insight, setInsight] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<string>('');
  const [testing, setTesting] = useState<boolean>(false);

  const handleGenerate = async () => {
    setLoading(true);
    const result = await analyzeInventory(analysisData);
    setInsight(result || "Não foi possível gerar insights.");
    setLoading(false);
    setHasLoaded(true);
  };

  // Auto-load on first mount if not loaded
  useEffect(() => {
    if (!hasLoaded && analysisData.length > 0) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisData]);

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <Sparkles size={20} />
          </div>
          <h3 className="text-lg font-bold text-indigo-900">Análise Inteligente (Gemini AI)</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-white rounded-md border border-indigo-200 hover:bg-indigo-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Analisando..." : "Atualizar Análise"}
          </button>
          <button
            onClick={async () => {
              setTesting(true);
              setTestStatus('');
              const result = await testGeminiKey();
              setTestStatus(result.message);
              setTesting(false);
            }}
            disabled={testing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-700 bg-white rounded-md border border-purple-200 hover:bg-purple-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
            {testing ? 'Testando...' : 'Testar Chave'}
          </button>
        </div>
      </div>

      {testStatus && (
        <div className={`mb-4 text-xs font-medium px-3 py-2 rounded border ${/válida|OK/i.test(testStatus) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{testStatus}</div>
      )}

      <div className="prose prose-sm text-indigo-800 max-w-none">
        {loading && !insight ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-indigo-200 rounded w-3/4"></div>
            <div className="h-4 bg-indigo-200 rounded w-full"></div>
            <div className="h-4 bg-indigo-200 rounded w-5/6"></div>
          </div>
        ) : (
          <ReactMarkdown>{insight}</ReactMarkdown>
        )}
      </div>
    </div>
  );
};
