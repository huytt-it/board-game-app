'use client';

import { useState, useEffect } from 'react';
import {
  ClocktowerRole,
  type ClocktowerTeam,
  ROLE_TEAMS,
  ROLE_ICONS,
  ROLE_NAMES_VI,
  ROLE_TEAM_VI,
  ROLE_FULL_DESC_VI,
} from '@/types/games/clocktower';

// ─── Stage types ────────────────────────────────────────────────────
// 0 = card shuffle   (auto 2.2 s)
// 1 = alignment      (auto 2.0 s)  Thiện / Ác
// 2 = faction        (auto 2.0 s)  Dân Làng / Ngoại Nhân / Tay Sai / Quỷ Dữ
// 3 = role name      (auto 2.0 s)  icon + EN + VI
// 4 = full skill     (manual)      Vietnamese ability + confirm button
type Stage = 0 | 1 | 2 | 3 | 4;

const STAGE_DURATIONS: number[] = [2200, 2000, 2000, 2000];

// Deterministic card fan positions (no Math.random in render)
const SHUFFLE_CARDS = [
  { x: -128, rot: -22, delay: 0 },
  { x: -64,  rot: -11, delay: 110 },
  { x: 0,    rot:   0, delay: 220 },
  { x: 64,   rot:  11, delay: 330 },
  { x: 128,  rot:  22, delay: 440 },
];

// Deterministic particles (no Math.random in render)
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  left: `${8 + (i * 6.4) % 84}%`,
  top:  `${12 + (i * 9.1) % 76}%`,
  delay: `${(i * 0.31) % 2}s`,
  dur:   `${1.4 + (i * 0.19) % 1.5}s`,
}));

const GOOD_TEAMS: ClocktowerTeam[] = ['townsfolk', 'outsider'];

// Per-faction colour tokens
const FC: Record<ClocktowerTeam, {
  glow: string; glowRgb: string;
  from: string; to: string;
  text: string; border: string; bg: string;
}> = {
  townsfolk: {
    glow: '#3b82f6', glowRgb: '59,130,246',
    from: 'from-blue-900/70', to: 'to-indigo-950/70',
    text: 'text-blue-200', border: 'border-blue-500/35', bg: 'bg-blue-900/30',
  },
  outsider: {
    glow: '#8b5cf6', glowRgb: '139,92,246',
    from: 'from-purple-900/70', to: 'to-violet-950/70',
    text: 'text-purple-200', border: 'border-purple-500/35', bg: 'bg-purple-900/30',
  },
  minion: {
    glow: '#f97316', glowRgb: '249,115,22',
    from: 'from-orange-900/70', to: 'to-red-950/70',
    text: 'text-orange-200', border: 'border-orange-500/35', bg: 'bg-orange-900/30',
  },
  demon: {
    glow: '#ef4444', glowRgb: '239,68,68',
    from: 'from-red-900/70', to: 'to-rose-950/70',
    text: 'text-red-200', border: 'border-red-500/45', bg: 'bg-red-900/35',
  },
};

const FACTION_ICON: Record<ClocktowerTeam, string> = {
  townsfolk: '🌟', outsider: '🌀', minion: '🗡️', demon: '👹',
};

interface Props {
  role: ClocktowerRole;
  onDismiss: () => void;
}

export default function RoleRevealAnimation({ role, onDismiss }: Props) {
  const [stage, setStage] = useState<Stage>(0);
  const [leaving, setLeaving] = useState(false);

  const team   = ROLE_TEAMS[role];
  const isGood = GOOD_TEAMS.includes(team);
  const fc     = FC[team];

  // Auto-advance stages 0 → 3
  useEffect(() => {
    if (stage >= 4) return;
    const t = setTimeout(
      () => setStage((s) => (s < 4 ? ((s + 1) as Stage) : s)),
      STAGE_DURATIONS[stage],
    );
    return () => clearTimeout(t);
  }, [stage]);

  const advance = () => { if (stage < 4) setStage((s) => ((s + 1) as Stage)); };

  const handleConfirm = () => {
    setLeaving(true);
    setTimeout(onDismiss, 400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        background: 'radial-gradient(ellipse at 50% 35%, rgba(12,6,30,0.98) 0%, rgba(2,1,8,0.99) 100%)',
        opacity: leaving ? 0 : 1,
        transition: 'opacity 0.4s ease-out',
      }}
      onClick={stage < 4 ? advance : undefined}
    >
      {/* ── Ambient particles ──────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full animate-sparkle"
            style={{
              left: p.left, top: p.top,
              background: isGood ? `rgba(59,130,246,0.6)` : `rgba(239,68,68,0.6)`,
              animationDelay: p.delay,
              animationDuration: p.dur,
            }}
          />
        ))}
      </div>

      {/* ── Stage 0: Card shuffle ───────────────────────────────────── */}
      {stage === 0 && (
        <div key="s0" className="flex flex-col items-center gap-8 animate-reveal-stage">
          <p className="text-slate-500 text-xs font-bold tracking-[0.3em] uppercase animate-pulse">
            🃏 Đang rút thẻ...
          </p>

          {/* Fan of face-down cards */}
          <div className="relative h-36 w-72">
            {SHUFFLE_CARDS.map((card, i) => (
              <div
                key={i}
                className="absolute top-0"
                style={{ left: `calc(50% - 40px)`, transform: `translateX(${card.x}px)`, zIndex: i }}
              >
                {/* rotation wrapper */}
                <div style={{ transform: `rotate(${card.rot}deg)` }}>
                  {/* fly-in animation wrapper */}
                  <div
                    className="w-20 h-28 rounded-xl border border-white/10 shadow-2xl overflow-hidden"
                    style={{
                      background: 'linear-gradient(145deg, #1e1b4b 0%, #0f172a 100%)',
                      animation: `card-deal 0.65s cubic-bezier(0.22,1,0.36,1) ${card.delay}ms both`,
                    }}
                  >
                    {/* Back pattern */}
                    <div
                      className="absolute inset-1.5 rounded-lg border border-white/5"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(45deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, transparent 1px, transparent 10px)',
                      }}
                    />
                    <div className="flex items-center justify-center h-full">
                      <span className="text-2xl opacity-10">❓</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-700">Nhấn để bỏ qua</p>
        </div>
      )}

      {/* ── Stage 1: Alignment (Thiện / Ác) ────────────────────────── */}
      {stage === 1 && (
        <div key="s1" className="flex flex-col items-center gap-6 px-8 animate-reveal-stage">
          <p className="text-slate-500 text-[11px] uppercase tracking-[0.35em] font-bold">
            Bạn thuộc phe
          </p>
          <div style={{ filter: `drop-shadow(0 0 48px ${isGood ? '#3b82f6' : '#ef4444'})` }}>
            <span className="text-[100px] leading-none block animate-float">
              {isGood ? '☀️' : '🌑'}
            </span>
          </div>
          <h1
            className={`text-[72px] font-black leading-none tracking-tight ${isGood ? 'text-blue-300' : 'text-red-300'}`}
            style={{ textShadow: `0 0 48px ${isGood ? '#3b82f6' : '#ef4444'}` }}
          >
            {isGood ? 'THIỆN' : 'ÁC'}
          </h1>
          <p className={`text-sm font-medium opacity-60 text-center max-w-xs ${isGood ? 'text-blue-300' : 'text-red-300'}`}>
            {isGood
              ? 'Bảo vệ làng, tìm và loại trừ Quỷ Dữ'
              : 'Che giấu danh tính và thống trị làng'}
          </p>
          <p className="text-[11px] text-slate-700 mt-2">Nhấn để tiếp tục →</p>
        </div>
      )}

      {/* ── Stage 2: Faction ───────────────────────────────────────── */}
      {stage === 2 && (
        <div key="s2" className="flex flex-col items-center gap-5 px-8 animate-reveal-stage">
          <p className="text-slate-500 text-[11px] uppercase tracking-[0.35em] font-bold">
            Nhân vật
          </p>
          <div style={{ filter: `drop-shadow(0 0 40px ${fc.glow})` }}>
            <span className="text-[88px] leading-none block animate-float">
              {FACTION_ICON[team]}
            </span>
          </div>
          <h1
            className={`text-[56px] font-black leading-tight ${fc.text}`}
            style={{ textShadow: `0 0 36px ${fc.glow}` }}
          >
            {ROLE_TEAM_VI[team]}
          </h1>
          <p className="text-[11px] text-slate-700 mt-2">Nhấn để tiếp tục →</p>
        </div>
      )}

      {/* ── Stage 3: Role name ─────────────────────────────────────── */}
      {stage === 3 && (
        <div key="s3" className="flex flex-col items-center gap-4 px-8 animate-reveal-stage">
          <p className="text-slate-500 text-[11px] uppercase tracking-[0.35em] font-bold">
            Vai trò của bạn
          </p>
          <div style={{ filter: `drop-shadow(0 0 52px ${fc.glow})` }}>
            <span className="text-[100px] leading-none block animate-float">
              {ROLE_ICONS[role]}
            </span>
          </div>
          <h1
            className={`text-[52px] font-black leading-none ${fc.text}`}
            style={{ textShadow: `0 0 44px ${fc.glow}` }}
          >
            {role}
          </h1>
          <p className="text-base font-bold text-white/50">{ROLE_NAMES_VI[role]}</p>
          <p className="text-[11px] text-slate-700 mt-2">Nhấn để xem kỹ năng →</p>
        </div>
      )}

      {/* ── Stage 4: Full skill card + confirm ─────────────────────── */}
      {stage === 4 && (
        <div
          key="s4"
          className="w-full max-w-sm px-4 animate-reveal-stage"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`rounded-3xl border ${fc.border} bg-gradient-to-b ${fc.from} ${fc.to} overflow-hidden`}
            style={{ boxShadow: `0 0 60px rgba(${fc.glowRgb},0.28), 0 24px 48px rgba(0,0,0,0.7)` }}
          >
            {/* Header */}
            <div className="flex flex-col items-center gap-2 pt-7 pb-4 px-6">
              <span className="text-[68px] leading-none animate-float">
                {ROLE_ICONS[role]}
              </span>
              <h2 className={`text-2xl font-black ${fc.text}`}>{role}</h2>
              <p className="text-sm text-white/45 font-semibold">{ROLE_NAMES_VI[role]}</p>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border ${fc.border} ${fc.bg} px-3.5 py-1 text-[11px] font-black uppercase tracking-wider ${fc.text}`}
              >
                {FACTION_ICON[team]} Phe {ROLE_TEAM_VI[team]}
              </span>
            </div>

            <div className="h-px bg-white/10 mx-5" />

            {/* Vietnamese skill description */}
            <div className="px-5 py-4">
              <p className="text-[10px] uppercase tracking-widest font-black text-white/35 mb-2.5 flex items-center gap-1.5">
                <span className="text-sm">⚡</span> Kỹ năng
              </p>
              <p className="text-[14px] font-semibold text-white leading-relaxed">
                {ROLE_FULL_DESC_VI[role]}
              </p>
            </div>

            {/* Confirm */}
            <div className="px-5 pb-6 pt-1">
              <button
                onClick={handleConfirm}
                className="w-full rounded-2xl py-4 font-black text-[15px] text-white transition-all active:scale-[0.97]"
                style={{
                  background: `linear-gradient(135deg, rgba(${fc.glowRgb},0.8), rgba(${fc.glowRgb},0.5))`,
                  boxShadow: `0 8px 28px rgba(${fc.glowRgb},0.4)`,
                }}
                id="dismiss-role-reveal-btn"
              >
                ✨ Tôi đã hiểu vai trò của mình
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
