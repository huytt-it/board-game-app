'use client';

import { GAME_REGISTRY, type GameRegistryEntry } from '@/lib/gameRegistry';

interface GameSelectionMenuProps {
  onSelectGame: (game: GameRegistryEntry) => void;
}

export default function GameSelectionMenu({ onSelectGame }: GameSelectionMenuProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {GAME_REGISTRY.map((game) => (
        <button
          key={game.key}
          onClick={() => game.enabled && onSelectGame(game)}
          disabled={!game.enabled}
          className={`group relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-300 ${
            game.enabled
              ? 'border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1 cursor-pointer'
              : 'border-white/5 bg-slate-900/50 opacity-60 cursor-not-allowed'
          }`}
          id={`game-card-${game.key}`}
        >
          {/* Glow effect */}
          {game.enabled && (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 to-cyan-500/0 opacity-0 transition-opacity duration-500 group-hover:opacity-10" />
          )}

          {/* Coming Soon badge */}
          {!game.enabled && (
            <div className="absolute right-3 top-3 rounded-full bg-slate-700/80 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Coming Soon
            </div>
          )}

          {/* Icon */}
          <div className="mb-4 text-5xl transition-transform duration-300 group-hover:scale-110">
            {game.icon}
          </div>

          {/* Title */}
          <h3 className="mb-2 text-lg font-bold text-white">
            {game.label}
          </h3>

          {/* Description */}
          <p className="mb-4 text-sm leading-relaxed text-slate-400">
            {game.description}
          </p>

          {/* Player count */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {game.minPlayers}–{game.maxPlayers} players
          </div>

          {/* Play arrow */}
          {game.enabled && (
            <div className="absolute bottom-4 right-4 rounded-full bg-purple-600/20 p-2 text-purple-400 opacity-0 transition-all duration-300 group-hover:opacity-100">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
