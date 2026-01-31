
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameState, Player, DiceValue, UserProfile, Stats } from './types';
import { multiplayerService } from './services/multiplayerService';
import { aiService } from './services/aiService';
import { Scoreboard } from './components/Scoreboard';
import { HueSelector } from './components/HueSelector';
import { PlayerSeat } from './components/PlayerSeat';
import { Die } from './components/Die';
import { CupIcon } from './components/CupIcon';
import { INITIAL_DICE_COUNT } from './constants';

const FallingDiceBackground: React.FC = () => {
  const diceCount = 15;
  const dice = useMemo(() => {
    return Array.from({ length: diceCount }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      duration: 5 + Math.random() * 10,
      delay: Math.random() * 10,
      size: 20 + Math.random() * 40,
      value: (Math.floor(Math.random() * 6) + 1) as DiceValue,
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {dice.map((die) => (
        <div
          key={die.id}
          className="falling-die"
          style={{
            left: `${die.left}%`,
            animationDuration: `${die.duration}s`,
            animationDelay: `${die.delay}s`,
            fontSize: `${die.size}px`,
          }}
        >
          {die.value === 1 ? '⚀' : die.value === 2 ? '⚁' : die.value === 3 ? '⚂' : die.value === 4 ? '⚃' : die.value === 5 ? '⚄' : '⚅'}
        </div>
      ))}
    </div>
  );
};

const ConfettiEffect: React.FC = () => {
  const pieces = useMemo(() => {
    return Array.from({ length: 100 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: `hsl(${Math.random() * 360}, 100%, 50%)`,
      duration: 2 + Math.random() * 3,
      delay: Math.random() * 2,
      size: 5 + Math.random() * 10,
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[100]">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const [screen, setScreen] = useState<'home' | 'lobby' | 'game'>('home');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'none'>('none');
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authName, setAuthName] = useState('');
  const [authHue, setAuthHue] = useState(200);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [connStatus, setConnStatus] = useState<'ok' | 'error' | 'none'>('none');

  const [roomIdInput, setRoomIdInput] = useState('');
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    const body = document.getElementById('app-body');
    if (body) {
      if (screen === 'home' || screen === 'lobby') body.classList.add('menu-active');
      else body.classList.remove('menu-active');
    }
  }, [screen]);

  useEffect(() => {
    const unsub = multiplayerService.onAuthChange((profile) => {
      setUserProfile(profile);
      if (profile) {
        setAuthHue(profile.hue);
        setConnStatus('ok');
      } else {
        setConnStatus('none');
      }
      setIsAuthLoading(false);
    });

    const timer = setTimeout(() => setIsAuthLoading(false), 3000);
    
    if (!multiplayerService.isConfigured()) {
      setConnStatus('error');
    }

    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (userProfile && authHue !== userProfile.hue) {
      const timeout = setTimeout(() => {
        multiplayerService.updateUserHue(userProfile.uid, authHue);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [authHue, userProfile]);

  useEffect(() => {
    if (gameState?.id && !gameState.isSinglePlayer) {
      const unsubscribe = multiplayerService.subscribe(gameState.id, (newState) => {
        setGameState(newState);
        if (newState.status !== 'waiting' && screen !== 'game') setScreen('game');
        else if (newState.status === 'waiting' && screen !== 'lobby') setScreen('lobby');
      });
      return unsubscribe;
    }
  }, [gameState?.id, gameState?.isSinglePlayer, screen]);

  const updateGameState = useCallback(async (newState: GameState) => {
    setGameState(newState);
    if (!newState.isSinglePlayer) {
      try { await multiplayerService.saveState(newState); } catch (e) { console.error(e); }
    }
  }, []);

  const [bidCount, setBidCount] = useState(1);
  const [bidValue, setBidValue] = useState<DiceValue>(2);

  const is1v1BothOneDie = useMemo(() => {
    if (!gameState) return false;
    const activePlayers = gameState.players.filter(p => !p.isEliminated);
    return activePlayers.length === 2 && activePlayers.every(p => p.dice.length === 1);
  }, [gameState?.players]);

  const getMinBid = useCallback((currentBid: GameState['currentBid'], targetValue: DiceValue, isPalifico: boolean): number => {
    if (!currentBid) return 1;
    const oldV = currentBid.value;
    const oldQ = currentBid.count;
    if (isPalifico) return targetValue === oldV ? oldQ + 1 : oldQ;
    if (oldV === targetValue) return oldQ + 1;
    if (targetValue === 1) return Math.ceil(oldQ / 2);
    if (oldV === 1) return (oldQ * 2) + 1;
    if (targetValue > oldV) return oldQ;
    return oldQ + 1;
  }, []);

  const currentMinQ = useMemo(() => 
    getMinBid(gameState?.currentBid, bidValue, !!gameState?.isPalifico),
    [gameState?.currentBid, bidValue, gameState?.isPalifico, getMinBid]
  );

  const startNewRound = useCallback(async (starterId: string, currentPlayers: Player[], isPalifico: boolean) => {
    const nextRoundPlayers = currentPlayers.map(p => ({
      ...p,
      dice: p.isEliminated ? [] : Array(p.dice.length).fill(0).map(() => Math.floor(Math.random() * 6 + 1) as DiceValue)
    }));

    let starterIndex = nextRoundPlayers.findIndex(p => p.id === starterId);
    if (starterIndex === -1 || nextRoundPlayers[starterIndex].isEliminated) {
      starterIndex = nextRoundPlayers.findIndex(p => !p.isEliminated);
    }

    const newState: GameState = {
      ...gameState!,
      status: 'bidding',
      players: nextRoundPlayers,
      currentTurnIndex: starterIndex,
      currentBid: undefined,
      lastResult: undefined,
      isPalifico,
      logs: [...gameState!.logs, isPalifico ? "PALIFICO ROUND!" : "New Round Started."],
      lastUpdated: Date.now()
    };
    await updateGameState(newState);
  }, [gameState, updateGameState]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (authMode === 'signup') await multiplayerService.signUp(authEmail, authPass, authName, authHue);
      else await multiplayerService.signIn(authEmail, authPass);
      setAuthMode('none');
      setConnStatus('ok');
    } catch (err: any) { 
      alert(err.message + (err.code === 'permission-denied' ? " - Check your Firestore Rules!" : "")); 
    }
  };

  const handleLogout = () => {
    multiplayerService.logout();
    setUserProfile(null);
  };

  const handleCreateRoom = async (isAI: boolean = false) => {
    if (!userProfile && !isAI) return setAuthMode('signin');
    const effectiveProfile: UserProfile = userProfile || {
      uid: 'guest-' + Math.random().toString(36).substring(7),
      displayName: 'Guest Player', hue: authHue, email: '', createdAt: Date.now()
    };
    if (isAI) {
      const roomId = "PRACTICE-" + Math.random().toString(36).substring(2, 6).toUpperCase();
      const host: Player = { id: effectiveProfile.uid, name: effectiveProfile.displayName, dice: [], cupColor: `hsl(${effectiveProfile.hue}, 70%, 50%)`, isHost: true, isActive: true, isEliminated: false };
      const aiPlayers: Player[] = Array(3).fill(0).map((_, i) => ({ id: `ai-${Math.random().toString(36).substr(2, 5)}`, name: aiService.getRandomName(), dice: [], cupColor: `hsl(${Math.random() * 360}, 70%, 50%)`, isHost: false, isActive: false, isEliminated: false, isAI: true }));
      setGameState({ id: roomId, status: 'waiting', players: [host, ...aiPlayers], currentTurnIndex: 0, logs: ["Practice Mode Started"], lastUpdated: Date.now(), isSinglePlayer: true });
      setScreen('lobby');
    } else {
      try {
        const state = await multiplayerService.createRoom(effectiveProfile);
        setGameState(state);
        setScreen('lobby');
      } catch (e: any) {
        alert("Could not create room. Check Firebase Rules! " + e.message);
      }
    }
  };

  const startGame = async () => {
    if (!gameState) return;
    const players = gameState.players.map(p => ({
      ...p, dice: Array(INITIAL_DICE_COUNT).fill(0).map(() => Math.floor(Math.random() * 6 + 1) as DiceValue), isEliminated: false
    }));
    await updateGameState({
      ...gameState, status: 'bidding', players, currentTurnIndex: Math.floor(Math.random() * players.length), currentBid: undefined, logs: ["Game Start! Paco is wild!"]
    });
  };

  const executeBid = async (count: number, value: DiceValue, actor: Player | UserProfile) => {
    if (!gameState) return;
    const actorId = 'uid' in actor ? actor.uid : actor.id;
    const actorName = 'displayName' in actor ? actor.displayName : actor.name;
    const actorPlayer = gameState.players.find(p => p.id === actorId);

    if (!gameState.currentBid) {
      if (!gameState.isPalifico) { if (value === 1) { alert("No Pacos on first bid!"); return; } }
      else if (!is1v1BothOneDie && actorPlayer?.dice.length === 1 && value !== actorPlayer.dice[0]) {
        alert(`In Palifico, start with your own die: ${actorPlayer.dice[0]}!`); return;
      }
    } else {
      if (gameState.isPalifico && value !== gameState.currentBid.value) { alert("Face locked in Palifico!"); return; }
      const minQ = getMinBid(gameState.currentBid, value, !!gameState.isPalifico);
      if (count < minQ) { alert(`Min bid is ${minQ}!`); return; }
    }

    let nextIndex = (gameState.currentTurnIndex + 1) % gameState.players.length;
    while (gameState.players[nextIndex].isEliminated) nextIndex = (nextIndex + 1) % gameState.players.length;

    const logs = [...gameState.logs];
    logs.push(`${actorName} bid ${count} x ${value}s`);
    await updateGameState({ ...gameState, currentTurnIndex: nextIndex, currentBid: { playerId: actorId, count, value }, logs });
  };

  const executeCall = async (type: 'dudo' | 'calza', actor: Player | UserProfile) => {
    if (!gameState || !gameState.currentBid) return;
    const actorId = 'uid' in actor ? actor.uid : actor.id;
    const actorName = 'displayName' in actor ? actor.displayName : actor.name;
    const bidderId = gameState.currentBid.playerId;
    const bidder = gameState.players.find(p => p.id === bidderId);
    if (!bidder) return;

    const allActiveDice = gameState.players.flatMap(p => p.isEliminated ? [] : p.dice);
    const bValue = gameState.currentBid.value;
    const bCount = gameState.currentBid.count;
    const actualCount = allActiveDice.filter(d => d === bValue || (!gameState.isPalifico && bValue !== 1 && d === 1)).length;

    let success = false;
    let loserId = '';
    if (type === 'dudo') { success = actualCount < bCount; loserId = success ? bidderId : actorId; }
    else { success = actualCount === bCount; loserId = success ? '' : actorId; }

    const updatedPlayers = gameState.players.map(p => {
      if (p.id === loserId) {
        const newDice = [...p.dice]; newDice.pop();
        return { ...p, dice: newDice, isEliminated: newDice.length === 0 };
      }
      if (type === 'calza' && success && p.id === actorId && p.dice.length < INITIAL_DICE_COUNT) {
        return { ...p, dice: [...p.dice, Math.floor(Math.random() * 6 + 1) as DiceValue] };
      }
      return p;
    });

    const activePlayers = updatedPlayers.filter(p => !p.isEliminated);
    const isGameOver = activePlayers.length <= 1;
    const winnerId = isGameOver ? activePlayers[0]?.id : undefined;

    if (!gameState.isSinglePlayer) {
      if (isGameOver && winnerId) {
        multiplayerService.updateGlobalStats(prev => ({
          ...prev,
          mostWins: winnerId === actorId && actorName !== 'Guest Player' ? 
            { name: actorName, count: (prev.mostWins?.count || 0) + 1 } : (prev.mostWins || {name: 'None', count: 0}),
          mostLosses: loserId && updatedPlayers.find(p => p.id === loserId)?.name !== 'Guest Player' ?
            { name: updatedPlayers.find(p => p.id === loserId)!.name, count: (prev.mostLosses?.count || 0) + 1 } : (prev.mostLosses || {name: 'None', count: 0})
        }));
      }
      if (type === 'calza' && success && actorName !== 'Guest Player') {
        multiplayerService.updateGlobalStats(prev => ({
          ...prev,
          bestCalza: bCount > (prev.bestCalza?.count || 0) ? { name: actorName, count: bCount, bid: `${bCount} x ${bValue}s` } : (prev.bestCalza || {name: 'None', count: 0, bid: 'N/A'})
        }));
      }
    }

    const resultState: GameState = { ...gameState, status: isGameOver ? 'game_over' : 'round_end', players: updatedPlayers, lastResult: { type, callerId: actorId, bidderId, success, actualCount, bidValue: bValue }, winnerId, logs: [...gameState.logs, `${actorName} called ${type.toUpperCase()}! ${success ? 'CORRECT!' : 'WRONG!'}`], isPalifico: !!(updatedPlayers.find(p => p.id === loserId)?.dice.length === 1), lastUpdated: Date.now() };
    await updateGameState(resultState);
    if (!isGameOver) setTimeout(() => startNewRound(loserId || actorId, updatedPlayers, resultState.isPalifico || false), 4000);
  };

  const myId = userProfile?.uid || gameState?.players.find(p => p.id.startsWith('guest-'))?.id;
  const isMyTurn = gameState?.players[gameState.currentTurnIndex]?.id === myId;
  const me = gameState?.players.find(p => p.id === myId);

  if (isAuthLoading) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="font-bungee text-xl">Connecting to CUPADOO...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white font-sans relative">
      {(screen === 'home' || screen === 'lobby') && <FallingDiceBackground />}
      {gameState?.status === 'game_over' && <ConfettiEffect />}
      
      {/* Connection Indicator */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/10 backdrop-blur">
         <div className={`w-2 h-2 rounded-full animate-pulse ${connStatus === 'ok' ? 'bg-green-500' : connStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`} />
         <span className="text-[10px] uppercase font-bold text-slate-400">{connStatus === 'ok' ? 'Online' : 'Configuration Error'}</span>
      </div>

      {screen === 'home' && (
        <div className="relative z-10 max-w-4xl mx-auto pt-12 pb-20 px-6 flex flex-col items-center">
          <div className="w-full flex justify-end mb-4">
            {userProfile ? (
              <div className="flex items-center gap-4 bg-white/10 px-4 py-2 rounded-2xl border border-white/20">
                <span className="text-slate-900 font-bold uppercase text-xs">{userProfile.displayName}</span>
                <button onClick={handleLogout} className="text-xs font-bungee text-red-600 hover:text-red-500 transition-colors">Logout</button>
              </div>
            ) : (
              <div className="flex gap-4">
                <button onClick={() => setAuthMode('signin')} className="text-slate-900 font-bungee text-sm hover:underline">Login</button>
                <button onClick={() => setAuthMode('signup')} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bungee text-xs shadow-lg hover:scale-105 transition-transform">Sign Up</button>
              </div>
            )}
          </div>

          <h1 className="text-8xl font-bungee text-slate-900 mb-2 drop-shadow-xl animate-bounce">CUPADOO</h1>
          <p className="text-slate-800 text-lg mb-8 uppercase tracking-widest font-black">Online Multi Liar's Dice</p>
          
          <div className="flex flex-col items-center mb-12 bg-white/30 p-6 rounded-3xl border border-white/40 backdrop-blur-md shadow-2xl">
            <CupIcon color={`hsl(${authHue}, 70%, 50%)`} className="mb-4 scale-150 drop-shadow-lg" />
            <HueSelector value={authHue} onChange={setAuthHue} />
          </div>

          {connStatus === 'error' && (
            <div className="bg-red-500/20 border border-red-500 p-6 rounded-3xl mb-8 backdrop-blur max-w-lg text-center">
              <h3 className="text-red-400 font-bungee mb-2">Configuration Required</h3>
              <p className="text-sm text-slate-300 mb-4">You need to add your Firebase API keys to <code>services/multiplayerService.ts</code> and update your <code>Firestore Security Rules</code>.</p>
              <button onClick={() => window.open('https://console.firebase.google.com/', '_blank')} className="bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-bold uppercase hover:bg-slate-200 transition-colors">Open Console</button>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8 w-full">
            <div className="bg-slate-900/90 p-8 rounded-3xl border border-slate-700 backdrop-blur flex flex-col items-center text-center shadow-2xl">
              <h2 className="text-2xl font-bungee mb-4 text-yellow-400">Solo Play</h2>
              <button onClick={() => handleCreateRoom(true)} className="w-full bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bungee py-4 rounded-xl shadow-lg transition-transform hover:scale-105">Practice Game</button>
            </div>
            <div className="bg-slate-900/90 p-8 rounded-3xl border border-slate-700 backdrop-blur flex flex-col items-center text-center shadow-2xl">
              <h2 className="text-2xl font-bungee mb-4 text-yellow-400">Multiplayer</h2>
              <div className="flex gap-2 w-full mb-4">
                <input value={roomIdInput} onChange={e => setRoomIdInput(e.target.value.toUpperCase())} placeholder="ROOM ID" className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 w-full font-mono text-center" />
                <button onClick={async () => { if (!userProfile) return setAuthMode('signin'); const state = await multiplayerService.joinRoom(roomIdInput, userProfile); if (state) { setGameState(state); setScreen('lobby'); } else alert("Room missing or full"); }} className="bg-blue-600 hover:bg-blue-500 px-6 rounded-xl font-bold">JOIN</button>
              </div>
              <button onClick={() => handleCreateRoom(false)} className="w-full bg-slate-700 hover:bg-slate-600 font-bold py-4 rounded-xl">CREATE ROOM</button>
            </div>
          </div>
          <div className="mt-12 w-full flex justify-center"><Scoreboard /></div>
        </div>
      )}

      {authMode !== 'none' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <form onSubmit={handleAuth} className="bg-slate-800 p-8 rounded-3xl border border-slate-700 max-w-sm w-full space-y-4 shadow-2xl">
            <h2 className="text-2xl font-bungee text-center text-yellow-400">{authMode === 'signup' ? 'Create Profile' : 'Welcome Back'}</h2>
            <p className="text-center text-slate-400 text-xs uppercase tracking-widest mb-2">
              {authMode === 'signup' ? 'Register to save your wins' : 'Sign in to access your stats'}
            </p>
            {authMode === 'signup' && (
              <input required placeholder="Your Player Name" value={authName} onChange={e => setAuthName(e.target.value)} className="w-full bg-slate-900 p-3 rounded-lg border border-slate-700 focus:border-yellow-400 outline-none transition-colors" />
            )}
            <input required type="email" placeholder="Email Address" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="w-full bg-slate-900 p-3 rounded-lg border border-slate-700 focus:border-yellow-400 outline-none transition-colors" />
            <input required type="password" placeholder="Password" value={authPass} onChange={e => setAuthPass(e.target.value)} className="w-full bg-slate-900 p-3 rounded-lg border border-slate-700 focus:border-yellow-400 outline-none transition-colors" />
            
            <button className="w-full bg-yellow-400 text-slate-900 font-bungee py-3 rounded-xl shadow-lg hover:scale-[1.02] transition-transform">
              {authMode === 'signup' ? 'Sign Up' : 'Login'}
            </button>
            
            <div className="text-center space-y-2 pt-2">
              <button type="button" onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} className="text-xs text-blue-400 hover:text-blue-300 font-bold uppercase tracking-widest">
                {authMode === 'signin' ? "Don't have an account? Sign up" : "Already have an account? Login"}
              </button>
              <button type="button" onClick={() => setAuthMode('none')} className="block w-full text-[10px] text-slate-500 hover:text-slate-400 uppercase font-bold tracking-[0.2em] pt-2">Close</button>
            </div>
          </form>
        </div>
      )}

      {screen === 'lobby' && gameState && (
        <div className="relative z-10 max-w-xl mx-auto pt-20 px-6">
          <div className="bg-slate-900/95 rounded-3xl border border-slate-700 p-8 shadow-2xl backdrop-blur">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bungee text-yellow-400">Lobby</h2>
              <div className="flex items-center gap-2">
                <span className="font-mono bg-slate-800 px-4 py-1 rounded-full text-xl border border-slate-600">{gameState.id}</span>
                <button onClick={() => { navigator.clipboard.writeText(gameState.id); alert("Copied!"); }} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition-colors">📋</button>
              </div>
            </div>
            <div className="space-y-4 mb-8">
              {gameState.players.map(p => (
                <div key={p.id} className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.cupColor }} />
                  <span className="font-bold flex-1">{p.name} {p.isHost ? '👑' : ''}</span>
                </div>
              ))}
            </div>
            {me?.isHost && <button onClick={startGame} disabled={gameState.players.length < 2} className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-slate-900 font-bungee py-4 rounded-2xl text-xl shadow-lg transition-colors">START GAME</button>}
          </div>
        </div>
      )}

      {screen === 'game' && gameState && (
        <div className="relative z-10 h-screen overflow-hidden flex flex-col bg-slate-900">
          <div className="p-4 flex justify-between items-center bg-slate-900/50 backdrop-blur z-20">
            <span className="text-2xl font-bungee text-yellow-400">CUPADOO {gameState.isPalifico && '🔥 PALIFICO'}</span>
            <div className="flex items-center gap-4">{gameState.logs.slice(-1).map((log, i) => <div key={i} className="bg-slate-800 px-4 py-2 rounded-lg text-sm font-bold border border-slate-700 animate-fade-in">{log}</div>)}</div>
          </div>
          <div className="flex-1 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] rounded-[100%] border-4 border-blue-700/50 felt-table shadow-2xl" />
            {gameState.players.map((p, i) => <PlayerSeat key={p.id} player={p} isMe={p.id === myId} isActive={gameState.currentTurnIndex === i && gameState.status === 'bidding'} angle={(i / gameState.players.length) * 2 * Math.PI - Math.PI/2} currentBid={gameState.currentBid} showDice={gameState.status === 'round_end' || gameState.status === 'game_over'} />)}
            {gameState.status === 'round_end' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center bg-black/80 p-8 rounded-3xl border border-white/20 z-30 shadow-2xl backdrop-blur">
                <h3 className="text-3xl font-bungee mb-2">{gameState.lastResult?.success ? 'SUCCESS' : 'WRONG'}</h3>
                <p>Found {gameState.lastResult?.actualCount} x {gameState.lastResult?.bidValue}s</p>
              </div>
            )}
            {gameState.status === 'game_over' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center bg-yellow-400 p-12 rounded-[3rem] border-8 border-yellow-200 z-50 animate-pulse">
                <h3 className="text-5xl font-bungee text-slate-900 mb-4">WINNER!</h3>
                <button onClick={() => setScreen('home')} className="mt-8 bg-slate-900 text-white font-bungee px-8 py-3 rounded-xl shadow-xl hover:scale-105 transition-transform">MENU</button>
              </div>
            )}
          </div>
          {gameState.status === 'bidding' && isMyTurn && (
            <div className="p-6 bg-slate-800/95 border-t border-slate-700 backdrop-blur-md">
              <div className="max-w-xl mx-auto flex flex-col gap-6">
                <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-700">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setBidCount(Math.max(currentMinQ, bidCount - 1))} className="w-8 h-8 bg-slate-700 rounded-full font-bold shadow-sm">-</button>
                    <span className="text-3xl font-bungee w-12 text-center">{bidCount}</span>
                    <button onClick={() => setBidCount(bidCount + 1)} className="w-8 h-8 bg-slate-700 rounded-full font-bold shadow-sm">+</button>
                  </div>
                  <div className="text-slate-500 text-3xl font-bungee">×</div>
                  <div className="flex items-center gap-4">
                    <button onClick={() => { let next = (bidValue - 1) as DiceValue; if (next < 1) next = 6; setBidValue(next); }} className="w-8 h-8 bg-slate-700 rounded-full font-bold shadow-sm" disabled={gameState.isPalifico && !!gameState.currentBid}>-</button>
                    <Die value={bidValue} size="md" />
                    <button onClick={() => { let next = (bidValue + 1) as DiceValue; if (next > 6) next = 1; setBidValue(next); }} className="w-8 h-8 bg-slate-700 rounded-full font-bold shadow-sm" disabled={gameState.isPalifico && !!gameState.currentBid}>+</button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <button disabled={!gameState.currentBid} onClick={() => executeCall('dudo', me!)} className="bg-red-500 font-bungee py-4 rounded-xl shadow-lg hover:bg-red-400 transition-colors">DUDO!</button>
                  <button onClick={() => executeBid(bidCount, bidValue, me!)} disabled={bidCount < currentMinQ} className="bg-yellow-400 text-slate-900 font-bungee py-4 rounded-xl shadow-lg hover:bg-yellow-300 transition-colors">BID</button>
                  <button disabled={!gameState.currentBid || gameState.isPalifico} onClick={() => executeCall('calza', me!)} className="bg-blue-600 font-bungee py-4 rounded-xl shadow-lg hover:bg-blue-500 transition-colors">CALZA!</button>
                </div>
              </div>
            </div>
          )}
          <div className="p-4 bg-slate-900 text-center text-xs text-slate-600 font-bold tracking-widest uppercase">
            {me && !me.isEliminated && <div className="flex justify-center gap-2 mb-2">Hand: {me.dice.map((d, i) => <Die key={i} value={d} size="sm" />)}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
