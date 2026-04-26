'use client';

import {
  ClocktowerRole,
  ClocktowerTeam,
  ROLE_ICONS,
  ROLE_NAMES_VI,
  ROLE_TEAM_VI,
  ROLE_TEAMS,
  ROLE_FULL_DESC_VI,
  ROLE_TIPS_VI,
} from '@/types/games/clocktower';

// ─── Per-team visual config ─────────────────────────────────────────────
const TEAM_CFG: Record<ClocktowerTeam, {
  heroFrom: string; heroVia: string; heroBorder: string;
  badge: string; tipDot: string; sectionBg: string;
  objective: string; objIcon: string;
}> = {
  townsfolk: {
    heroFrom: 'from-blue-800', heroVia: 'via-indigo-900', heroBorder: 'border-blue-500/25',
    badge: 'bg-blue-500/20 text-blue-200 border border-blue-500/30',
    tipDot: 'bg-blue-400',
    sectionBg: 'bg-blue-950/30 border-blue-500/15',
    objective: 'Tìm và xử tử Quỷ bằng bỏ phiếu đa số. Chia sẻ thông tin, thuyết phục làng và loại trừ phe ác trước khi quá muộn.',
    objIcon: '🌟',
  },
  outsider: {
    heroFrom: 'from-purple-800', heroVia: 'via-violet-900', heroBorder: 'border-purple-500/25',
    badge: 'bg-purple-500/20 text-purple-200 border border-purple-500/30',
    tipDot: 'bg-purple-400',
    sectionBg: 'bg-purple-950/30 border-purple-500/15',
    objective: 'Về phe Thiện nhưng mang đặc điểm phức tạp. Sống sót và hỗ trợ làng theo cách riêng của bạn — đôi khi bằng sự khác biệt.',
    objIcon: '🌀',
  },
  minion: {
    heroFrom: 'from-orange-800', heroVia: 'via-red-900', heroBorder: 'border-orange-500/25',
    badge: 'bg-orange-500/20 text-orange-200 border border-orange-500/30',
    tipDot: 'bg-orange-400',
    sectionBg: 'bg-orange-950/30 border-orange-500/15',
    objective: 'Bảo vệ Quỷ bằng mọi giá. Gieo rắc nghi ngờ, hỗn loạn và che chắn để Quỷ tồn tại đến khi phe ác chiếm ưu thế.',
    objIcon: '🗡️',
  },
  demon: {
    heroFrom: 'from-red-800', heroVia: 'via-rose-950', heroBorder: 'border-red-500/35',
    badge: 'bg-red-500/20 text-red-200 border border-red-500/35',
    tipDot: 'bg-red-500',
    sectionBg: 'bg-red-950/35 border-red-500/20',
    objective: 'Giết người mỗi đêm và ẩn náu đến khi số phe ác bằng phe thiện. Đừng để bị lộ — một khi bị phát hiện, mọi thứ sẽ sụp đổ.',
    objIcon: '👹',
  },
};

const TEAM_EMOJI: Record<ClocktowerTeam, string> = {
  townsfolk: '🌟',
  outsider: '🌀',
  minion: '🗡️',
  demon: '👹',
};

interface PlayerRoleCardProps {
  role: ClocktowerRole;
  onClose: () => void;
}

export default function PlayerRoleCard({ role, onClose }: PlayerRoleCardProps) {
  const team = ROLE_TEAMS[role];
  const cfg = TEAM_CFG[team];
  const tips = ROLE_TIPS_VI[role];

  return (
    /* Dark scrim */
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {/* Sheet */}
      <div
        className="relative flex flex-col rounded-t-3xl bg-slate-900 max-h-[94dvh] overflow-hidden animate-slide-up shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 shrink-0">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* ── Hero section ──────────────────────────────────────────── */}
        <div className={`relative shrink-0 bg-gradient-to-b ${cfg.heroFrom} ${cfg.heroVia} to-slate-900 px-6 pt-5 pb-7 border-b ${cfg.heroBorder}`}>
          {/* Dot-grid texture overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }}
          />

          {/* Glow blob */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-40 w-72 blur-3xl opacity-20 bg-white rounded-full pointer-events-none" />

          {/* Icon */}
          <div className="relative flex justify-center mb-4 z-10">
            <span className="text-[80px] leading-none block animate-float drop-shadow-2xl">{ROLE_ICONS[role]}</span>
          </div>

          {/* Names */}
          <div className="text-center relative z-10">
            <h2 className="text-[28px] font-black text-white tracking-tight leading-tight">{role}</h2>
            <p className="text-base font-semibold text-white/60 mt-1">{ROLE_NAMES_VI[role]}</p>
          </div>

          {/* Team badge */}
          <div className="flex justify-center mt-4 relative z-10">
            <span className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2 text-sm font-bold ${cfg.badge}`}>
              <span>{TEAM_EMOJI[team]}</span>
              <span>Phe {ROLE_TEAM_VI[team]}</span>
              <span className="opacity-40">·</span>
              <span className="opacity-60 text-xs font-normal italic">{team}</span>
            </span>
          </div>
        </div>

        {/* ── Scrollable details ─────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-4 py-4 space-y-3 pb-safe">

          {/* Mục tiêu */}
          <div className={`rounded-2xl border p-4 ${cfg.sectionBg}`}>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 flex items-center gap-1.5">
              <span>{cfg.objIcon}</span> Mục tiêu
            </p>
            <p className="text-sm text-slate-100 leading-relaxed">{cfg.objective}</p>
          </div>

          {/* Kỹ năng */}
          <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2 flex items-center gap-1.5">
              <span>⚡</span> Kỹ năng
            </p>
            <p className="text-sm text-slate-200 leading-relaxed">{ROLE_FULL_DESC_VI[role]}</p>
          </div>

          {/* Gợi ý chơi */}
          {tips.length > 0 && (
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-3 flex items-center gap-1.5">
                <span>💡</span> Gợi ý chơi
              </p>
              <div className="space-y-3">
                {tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cfg.tipDot}`} />
                    <p className="text-sm text-slate-300 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-bold text-slate-400 active:scale-[0.98] active:bg-white/10 transition-all"
          >
            ✕ Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
