'use client';

import { useState } from 'react';
import GameSelectionMenu from '@/components/core/GameSelectionMenu';
import RoomEntry from '@/components/core/RoomEntry';
import type { GameRegistryEntry } from '@/lib/gameRegistry';

export default function HomePage() {
  const [selectedGame, setSelectedGame] = useState<GameRegistryEntry | null>(null);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        {/* Animated icon */}
        <div className="mb-6 inline-flex animate-float items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600/20 to-cyan-500/20 p-5">
          <span className="text-5xl">🎭</span>
        </div>

        <h1 className="mb-4 bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl">
          Board Game Arena
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-400">
          Play your favorite social deduction games online with friends.
          No downloads, no sign-ups — just pick a game and start playing.
        </p>

        {/* Stats bar */}
        <div className="mt-8 flex items-center justify-center gap-8">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">3</p>
            <p className="text-xs text-slate-500">Games</p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white">5-20</p>
            <p className="text-xs text-slate-500">Players</p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">Free</p>
            <p className="text-xs text-slate-500">Forever</p>
          </div>
        </div>
      </div>

      {/* Game Selection */}
      <section>
        <h2 className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-slate-500">
          Choose Your Game
        </h2>
        <GameSelectionMenu onSelectGame={setSelectedGame} />
      </section>

      {/* Room Entry Modal */}
      {selectedGame && (
        <RoomEntry
          game={selectedGame}
          isOpen={!!selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}

      {/* Footer */}
      <footer className="mt-16 border-t border-white/5 pt-8 text-center text-xs text-slate-600">
        <p>Built for social deduction enthusiasts. Open source &amp; community-driven.</p>
      </footer>
    </div>
  );
}
