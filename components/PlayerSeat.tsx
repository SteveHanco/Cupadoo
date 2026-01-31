
import React from 'react';
import { Player, Bid } from '../types';
import { CupIcon } from './CupIcon';
import { Die } from './Die';

interface PlayerSeatProps {
  player: Player;
  isMe: boolean;
  isActive: boolean;
  angle: number;
  currentBid?: Bid;
  showDice?: boolean;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({ player, isMe, isActive, angle, currentBid, showDice }) => {
  // Positioning logic around the elliptical table
  const x = 50 + 40 * Math.cos(angle);
  const y = 50 + 40 * Math.sin(angle);

  return (
    <div 
      className={`absolute transition-all duration-700 flex flex-col items-center justify-center`}
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
    >
      <div className={`relative p-2 rounded-full transition-all ${isActive ? 'ring-4 ring-yellow-400 scale-110' : ''}`}>
        <CupIcon color={player.cupColor} isShaking={isActive && !isMe} isUp={showDice} />
        
        {/* Dice tray */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1 bg-black/40 p-1 rounded-md">
          {isMe || showDice ? (
            player.dice.map((d, i) => <Die key={i} value={d} size="sm" />)
          ) : (
            Array(player.dice.length).fill(0).map((_, i) => (
              <div key={i} className="w-3 h-3 bg-white/20 rounded-full" />
            ))
          )}
        </div>
      </div>

      <div className="mt-6 text-center">
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${isMe ? 'bg-blue-500' : 'bg-slate-700'}`}>
          {player.name} {isMe ? '(YOU)' : ''}
        </span>
        {player.isEliminated && (
          <div className="text-red-500 font-bungee text-[10px] mt-1">ELIMINATED</div>
        )}
      </div>

      {currentBid?.playerId === player.id && (
        <div className="absolute -top-16 bg-white text-slate-900 px-3 py-1 rounded-full shadow-lg font-bold flex items-center gap-2 animate-bounce">
          <span className="text-sm">{currentBid.count} x</span>
          <Die value={currentBid.value} size="sm" />
        </div>
      )}
    </div>
  );
};
