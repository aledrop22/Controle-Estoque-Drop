
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

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color, subtext, onClick, isActive }) => {
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
        {subtext && <p className="text-xs text-gray-400 mt-2">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
        <Icon size={24} />
      </div>
    </div>
  );
};
