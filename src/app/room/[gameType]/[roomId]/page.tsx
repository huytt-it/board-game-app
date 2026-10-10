'use client';

import { use, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRoom } from '@/hooks/useRoom';
import { useAuth } from '@/hooks/useAuth';
import { getGameComponent, getGameEntry } from '@/lib/gameRegistry';
import LoadingSpinner from '@/components/core/LoadingSpinner';
import type { GameType } from '@/types/room';

// Avalon has its own invite screen (its own scene, in Vietnamese); loaded only
// when an Avalon room is opened, from the board's module (same chunk).
const AvalonJoinScreen = dynamic(() => import('@/components/games/avalon/AvalonBoard').then((m) => m.AvalonJoinScreen), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner text="Entering room..." />
    </div>
  ),
});

export default function RoomPage({
  params,
}: {
  params: Promise<{ gameType: string; roomId: string }>
}) {
  const { gameType, roomId } = use(params);
  const { playerId, isLoading: authLoading } = useAuth();
  const { room, players, isHost, isLoading: roomLoading, loadError, joinRoomById } = useRoom(roomId, playerId);
  const [displayName, setDisplayName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Validate game type
  const gameEntry = getGameEntry(gameType as GameType);
  const GameComponent = getGameComponent(gameType as GameType);

  // useRoom does not load anything until there is a playerId, so only wait on
  // the room once we have one — otherwise a failed auth would spin forever.
  if (authLoading || (playerId && roomLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner text="Entering room..." />
      </div>
    );
  }

  if (loadError && !room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <div className="text-6xl">⚠️</div>
        <h1 className="text-2xl font-bold text-white">Connection Problem</h1>
        <p className="max-w-md text-center text-slate-400">
          Couldn&apos;t load this room: <span className="text-red-300">{loadError}</span>
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 font-semibold text-white transition-all hover:from-purple-500 hover:to-indigo-500"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!gameEntry || !gameEntry.enabled) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <div className="text-6xl">🚫</div>
        <h1 className="text-2xl font-bold text-white">Game Not Found</h1>
        <p className="text-slate-400">
          The game type <code className="rounded bg-white/10 px-2 py-0.5 text-purple-300">{gameType}</code> is not available.
        </p>
        <a
          href="/"
          className="mt-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 font-semibold text-white transition-all hover:from-purple-500 hover:to-indigo-500"
        >
          ← Back to Home
        </a>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <div className="text-6xl">🔍</div>
        <h1 className="text-2xl font-bold text-white">Room Not Found</h1>
        <p className="text-slate-400">This room doesn&apos;t exist or has been closed.</p>
        <a
          href="/"
          className="mt-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 font-semibold text-white transition-all hover:from-purple-500 hover:to-indigo-500"
        >
          ← Back to Home
        </a>
      </div>
    );
  }

  if (!GameComponent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <div className="text-6xl">🔧</div>
        <h1 className="text-2xl font-bold text-white">Coming Soon</h1>
        <p className="text-slate-400">{gameEntry.label} is still in development.</p>
        <a
          href="/"
          className="mt-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 font-semibold text-white transition-all hover:from-purple-500 hover:to-indigo-500"
        >
          ← Back to Home
        </a>
      </div>
    );
  }

  if (!playerId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <div className="text-6xl">👤</div>
        <h1 className="text-2xl font-bold text-white">Authentication Required</h1>
        <p className="text-slate-400">Unable to establish your identity. Please try again.</p>
        <a
          href="/"
          className="mt-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 font-semibold text-white transition-all hover:from-purple-500 hover:to-indigo-500"
        >
          ← Back to Home
        </a>
      </div>
    );
  }

  const isPlayerInRoom = players.some(p => p.id === playerId);

  const handleJoin = async () => {
    if (!playerId || !displayName.trim()) return;
    setIsJoining(true);
    setJoinError(null);
    try {
      await joinRoomById(roomId, playerId, displayName.trim());
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  if (!isPlayerInRoom && room && gameType === 'avalon') {
    return (
      <AvalonJoinScreen room={room} players={players} onJoin={(name) => joinRoomById(roomId, playerId, name)} />
    );
  }

  if (!isPlayerInRoom && room) {
     return (
       <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-8 text-center animate-fade-in">
         <div className="text-6xl mb-4 animate-bounce">👋</div>
         <h1 className="text-3xl font-black text-white">Join Room</h1>
         <p className="text-slate-400 max-w-sm">
           You&apos;ve been invited to play <strong>{gameEntry?.label}</strong>! Enter your name to join the lobby.
         </p>
         
         <div className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl text-left">
           <div>
             <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="display-name-input">
               Display Name
             </label>
             <input
               id="display-name-input"
               type="text"
               value={displayName}
               onChange={(e) => setDisplayName(e.target.value)}
               placeholder="Enter your name..."
               maxLength={20}
               className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
               onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
             />
           </div>
           
           {joinError && (
             <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
               {joinError}
             </div>
           )}

           <button
             onClick={handleJoin}
             disabled={isJoining || !displayName.trim()}
             className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 px-4 py-3 font-semibold text-white transition-all hover:from-cyan-500 hover:to-cyan-600 shadow-lg shadow-cyan-500/25 disabled:opacity-40"
           >
             {isJoining ? 'Joining...' : 'Join Game'}
           </button>
         </div>
         
         <a
           href="/"
           className="mt-4 text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors"
         >
           Cancel and return to home
         </a>
       </div>
     );
  }

  return (
    // Avalon lays out its own padding (full-width top bar, scenes).
    <div className={gameType === 'avalon' ? 'min-h-screen' : 'min-h-screen px-4 py-6 sm:px-6 lg:px-8'}>
      <GameComponent
        room={room}
        players={players}
        playerId={playerId}
        isHost={isHost}
      />
    </div>
  );
}
