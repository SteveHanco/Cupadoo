
import React, { useEffect, useState } from 'react';
import { Stats } from '../types';
import { DEFAULT_STATS } from '../constants';
import { multiplayerService } from '../services/multiplayerService';

export const Scoreboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);

  useEffect(() => {
    const unsubscribe = multiplayerService.subscribeToStats((newStats) => {
      setStats(newStats);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="bg-slate-800/80 backdrop-blur rounded-2xl p-6 border border-slate-700 shadow-2xl w-full max-w-md">
      <h2 className="text-2xl font-bungee text-yellow-400 mb-6 flex items-center gap-2">
        🏆 HALL OF FAME
      </h2>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg border border-slate-600">
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold">Most Wins</p>
            <p className="text-lg font-bold">{stats.mostWins.name}</p>
          </div>
          <div className="text-2xl font-bungee text-green-400">{stats.mostWins.count}</div>
        </div>

        <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg border border-slate-600">
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold">Most Losses</p>
            <p className="text-lg font-bold">{stats.mostLosses.name}</p>
          </div>
          <div className="text-2xl font-bungee text-red-400">{stats.mostLosses.count}</div>
        </div>

        <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg border border-slate-600">
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold">Best Calza (Exact Call)</p>
            <p className="text-lg font-bold">{stats.bestCalza.name}</p>
            <p className="text-xs text-yellow-400 italic">"{stats.bestCalza.bid}"</p>
          </div>
          <div className="text-2xl font-bungee text-yellow-400">{stats.bestCalza.count}</div>
        </div>
      </div>

      <p className="mt-6 text-[10px] text-slate-500 text-center uppercase tracking-widest">
        Updating in real-time via CUPADOO Cloud
      </p>
    </div>
  );
};
