'use client';

import { use } from 'react';
import { useRoom } from '@/hooks/useRoom';
import { useAuth } from '@/hooks/useAuth';
import { getGameComponent, getGameEntry } from '@/lib/gameRegistry';
import LoadingSpinner from '@/components/core/LoadingSpinner';
import type { GameType } from '@/types/room';

export default function RoomPage({
  params,
}: {
  params: Promise<{ gameType: string; roomId: string }>
}) {
  const { gameType, roomId } = use(params);
  const { playerId, isLoading: authLoading } = useAuth();
  const { room, players, isHost, isLoading: roomLoading } = useRoom(roomId, playerId);

  // Validate game type
  const gameEntry = getGameEntry(gameType as GameType);
  const GameComponent = getGameComponent(gameType as GameType);

  if (authLoading || roomLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner text="Entering room..." />
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

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <GameComponent
        room={room}
        players={players}
        playerId={playerId}
        isHost={isHost}
      />
    </div>
  );
}
