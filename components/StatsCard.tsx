
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'red' | 'green' | 'yellow';
  subtext?: string;
  onClick?: () => void;
  isActive?: boolean;
  compareToday?: number; // valor atual para comparação (ex: hoje)
  compareYesterday?: number; // valor anterior para comparação (ex: ontem)
}

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  red: 'bg-red-100 text-red-600',
  green: 'bg-emerald-100 text-emerald-600',
  yellow: 'bg-yellow-100 text-yellow-600',
};

const borderClasses = {
  blue: 'border-blue-500 ring-1 ring-blue-500',
  red: 'border-red-500 ring-1 ring-red-500',
  green: 'border-green-500 ring-1 ring-green-500',
  yellow: 'border-yellow-500 ring-1 ring-yellow-500',
};

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color, subtext, onClick, isActive, compareToday, compareYesterday }) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white p-6 rounded-xl shadow-sm border transition-all duration-200
        ${isActive ? borderClasses[color] : 'border-gray-100 hover:border-gray-300'}
        ${onClick ? 'cursor-pointer hover:shadow-md' : ''}
        flex items-start justify-between
      `}
    >
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        {typeof compareYesterday === 'number' && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            {(() => {
              const todayVal = typeof compareToday === 'number' ? compareToday : (typeof value === 'number' ? value : NaN);
              const isUp = !isNaN(todayVal as number) ? (todayVal as number) >= compareYesterday : false;
              const upColor = color === 'blue' ? 'bg-blue-100 text-blue-700' : color === 'yellow' ? 'bg-yellow-100 text-yellow-700' : color === 'green' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';
              // Regra: para cards não vermelhos, manter a cor do card mesmo em queda.
              const cls = color === 'red'
                ? (isUp ? upColor : 'bg-red-100 text-red-700')
                : upColor;
              const hasToday = !isNaN(todayVal as number);
              const diff = hasToday ? (todayVal as number) - compareYesterday : 0;
              const sign = diff > 0 ? '+' : diff < 0 ? '-' : '';
              const absDiff = Math.abs(diff);
              const pctRaw = compareYesterday > 0 ? (absDiff / compareYesterday) * 100 : (absDiff > 0 ? 100 : 0);
              const pct = Number(pctRaw.toFixed(1));
              return (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded font-semibold ${cls}`}>
                  {isUp ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>
                  )}
                  Ontem {compareYesterday}
                  {hasToday && (
                    <span className="ml-1 opacity-80 font-mono">
                      {sign}{absDiff} ({sign}{pct}%)
                    </span>
                  )}
                </span>
              );
            })()}
          </div>
        )}
        {subtext && <p className="text-xs text-gray-400 mt-2">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
        <Icon size={24} />
      </div>
    </div>
  );
};
