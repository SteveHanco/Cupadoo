
import React from 'react';

interface HueSelectorProps {
  value: number;
  onChange: (hue: number) => void;
}

export const HueSelector: React.FC<HueSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="w-full space-y-2">
      <label className="block text-sm font-medium text-slate-300">Choose Cup Color</label>
      <div className="relative h-8 rounded-lg overflow-hidden flex items-center">
        <input
          type="range"
          min="0"
          max="360"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-full cursor-pointer opacity-0 absolute z-10"
        />
        <div 
          className="w-full h-4 rounded-full"
          style={{ 
            background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' 
          }}
        />
        <div 
          className="absolute w-6 h-6 border-2 border-white rounded-full pointer-events-none shadow-lg"
          style={{ 
            left: `${(value / 360) * 100}%`,
            transform: 'translateX(-50%)',
            backgroundColor: `hsl(${value}, 70%, 50%)`
          }}
        />
      </div>
    </div>
  );
};
