'use client';

import { useState } from 'react';
import {
  ClocktowerRole,
  ROLE_TEAMS,
  ROLE_ABILITIES,
  ROLE_ICONS,
  ROLE_SHORT_DESC,
  type ClocktowerTeam,
} from '@/types/games/clocktower';

interface RoleRevealAnimationProps {
  role: ClocktowerRole;
  onDismiss: () => void;
}

const TEAM_STYLES: Record<ClocktowerTeam, { gradient: string; glow: string; accent: string }> = {
  townsfolk: {
    gradient: 'from-blue-600/30 via-blue-800/20 to-indigo-900/30',
    glow: 'rgba(59, 130, 246, 0.4)',
    accent: 'text-blue-300',
  },
  outsider: {
    gradient: 'from-teal-600/30 via-teal-800/20 to-emerald-900/30',
    glow: 'rgba(20, 184, 166, 0.4)',
    accent: 'text-teal-300',
  },
  minion: {
    gradient: 'from-orange-600/30 via-orange-800/20 to-red-900/30',
    glow: 'rgba(249, 115, 22, 0.4)',
    accent: 'text-orange-300',
  },
  demon: {
    gradient: 'from-red-600/30 via-red-800/20 to-rose-900/30',
    glow: 'rgba(239, 68, 68, 0.5)',
    accent: 'text-red-300',
  },
};

const TEAM_BADGE_STYLES: Record<ClocktowerTeam, string> = {
  townsfolk: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  outsider: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  minion: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  demon: 'bg-red-500/20 text-red-300 border-red-500/30',
};

/**
 * Full-screen overlay with 3D card flip animation revealing the player's role.
 * Shows role icon, name, team badge, short description, and full ability text.
 */
export default function RoleRevealAnimation({ role, onDismiss }: RoleRevealAnimationProps) {
  const [dismissed, setDismissed] = useState(false);
  const team = ROLE_TEAMS[role];
  const style = TEAM_STYLES[team];
  const icon = ROLE_ICONS[role];
  const shortDesc = ROLE_SHORT_DESC[role];
  const ability = ROLE_ABILITIES[role];

  const handleDismiss = () => {
    setDismissed(true);
    setTimeout(onDismiss, 500);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${
        dismissed ? 'animate-fade-in' : 'animate-overlay-in'
      }`}
      style={{
        background: 'radial-gradient(circle at center, rgba(15,10,30,0.95) 0%, rgba(5,2,15,0.98) 100%)',
        opacity: dismissed ? 0 : undefined,
        transition: dismissed ? 'opacity 0.5s ease-out' : undefined,
      }}
    >
      {/* Sparkle particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-sparkle"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${20 + Math.random() * 60}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${Math.random() * 1.5 + 1.5}s`,
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: style.glow }}
            />
          </div>
        ))}
      </div>

      {/* Card container */}
      <div className="perspective-container">
        <div
          className={`relative animate-card-flip rounded-3xl border border-white/10 bg-gradient-to-br ${style.gradient} p-8 sm:p-10 max-w-md w-full`}
          style={{
            boxShadow: `0 0 60px ${style.glow}, 0 25px 50px rgba(0,0,0,0.5)`,
          }}
        >
          {/* Team badge */}
          <div className="flex justify-center mb-5">
            <span
              className={`rounded-full border px-4 py-1 text-xs font-bold uppercase tracking-widest ${TEAM_BADGE_STYLES[team]}`}
            >
              {team}
            </span>
          </div>

          {/* Role icon */}
          <div className="text-center mb-4">
            <span className="text-8xl block animate-float">{icon}</span>
          </div>

          {/* Role name */}
          <h2 className={`text-center text-3xl sm:text-4xl font-black mb-2 ${style.accent}`}>
            {role}
          </h2>

          {/* Short description */}
          <p className="text-center text-sm text-slate-300 mb-5 font-medium">
            {shortDesc}
          </p>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-5" />

          {/* Full ability text */}
          <div className="rounded-xl bg-black/20 border border-white/5 p-4 mb-6">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2 font-semibold">Ability</p>
            <p className="text-sm text-slate-200 leading-relaxed">{ability}</p>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className={`w-full rounded-xl bg-gradient-to-r ${
              team === 'demon' || team === 'minion'
                ? 'from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500'
                : 'from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500'
            } px-6 py-4 text-lg font-bold text-white transition-all hover:shadow-lg hover:shadow-purple-500/25`}
            id="dismiss-role-reveal-btn"
          >
            ✨ I Understand My Role
          </button>
        </div>
      </div>
    </div>
  );
}
