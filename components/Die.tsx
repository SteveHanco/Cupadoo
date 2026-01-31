
import React from 'react';
import { DiceValue } from '../types';

interface DieProps {
  value: DiceValue;
  size?: 'sm' | 'md' | 'lg';
  isPaco?: boolean;
}

export const Die: React.FC<DieProps> = ({ value, size = 'md', isPaco = false }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xl',
    md: 'w-10 h-10 text-3xl',
    lg: 'w-14 h-14 text-5xl'
  };

  return (
    <div className={`${sizeClasses[size]} bg-white text-slate-900 rounded-lg flex items-center justify-center shadow-md font-bold select-none transition-all hover:scale-105 ${isPaco ? 'ring-2 ring-yellow-400' : ''}`}>
      {value === 1 ? '⚀' : value === 2 ? '⚁' : value === 3 ? '⚂' : value === 4 ? '⚃' : value === 5 ? '⚄' : '⚅'}
    </div>
  );
};
