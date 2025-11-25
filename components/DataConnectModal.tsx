import React, { useState } from 'react';
import { X, Link, Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { fetchGoogleSheetData, parseCSV } from '../services/csvService';
import { Product } from '../src/types';

interface DataConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (data: Product[]) => void;
}

export const DataConnectModal: React.FC<DataConnectModalProps> = ({ isOpen, onClose, onDataLoaded }) => {
  const [activeTab, setActiveTab] = useState<'url' | 'file'>('url');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await fetchGoogleSheetData(url);
      if (data.length === 0) throw new Error("Nenhum dado encontrado na planilha.");
      onDataLoaded(data);
      onClose();
    } catch (err: any) {
      setError("Erro ao ler URL. Verifique se a planilha está 'Publicada na Web' como CSV.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const data = parseCSV(text);
        if (data.length === 0) throw new Error("Arquivo vazio ou formato inválido.");
        onDataLoaded(data);
        onClose();
      } catch (err) {
        setError("Erro ao processar arquivo. Verifique o formato CSV.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FileSpreadsheet className="text-green-600" size={20} />
            Conectar Planilha
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-500 mb-6">
            Importe seus dados reais de estoque. A planilha deve conter cabeçalhos:
            <br />
            <code className="bg-gray-100 text-gray-700 px-1 rounded text-xs">id, name, category, price, currentStock</code>
          </p>

          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('url')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${activeTab === 'url'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Link size={16} /> Link Google Sheets
              </div>
            </button>
            <button
              onClick={() => setActiveTab('file')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${activeTab === 'file'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Upload size={16} /> Upload CSV
              </div>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {activeTab === 'url' ? (
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Link Público (CSV)
                </label>
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  No Google Sheets: Arquivo &gt; Compartilhar &gt; Publicar na Web &gt; Formato CSV.
                </p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? "Carregando..." : "Conectar Dados"}
              </button>
            </form>
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="mx-auto text-gray-300 mb-2" size={32} />
              <p className="text-sm font-medium text-gray-600">Clique para selecionar ou arraste o arquivo</p>
              <p className="text-xs text-gray-400 mt-1">Formato .CSV</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};