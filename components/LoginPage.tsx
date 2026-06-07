// components/LoginPage.tsx
import React, { useState } from 'react';
import { signIn, signUp } from '../supabase/auth';
import { AlertCircle, Loader } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        setError('Verifique seu email para confirmar o cadastro!');
      } else {
        await signIn(email, password);
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Controle de Estoque</h1>
        <p className="text-gray-600 mb-6">Seu Armazém Drop - Scraper Dashboard</p>

        {error && (
          <div className={`flex gap-3 p-4 rounded-lg mb-6 ${isSignUp && error.includes('Verifique') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <AlertCircle className={isSignUp && error.includes('Verifique') ? 'text-green-600' : 'text-red-600'} size={20} />
            <p className={isSignUp && error.includes('Verifique') ? 'text-green-700' : 'text-red-700'}>
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading && <Loader size={18} className="animate-spin" />}
            {isSignUp ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
          }}
          disabled={loading}
          className="w-full mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium disabled:text-gray-400"
        >
          {isSignUp ? 'Já tenho conta - Fazer Login' : 'Não tenho conta - Criar Conta'}
        </button>
      </div>
    </div>
  );
};
