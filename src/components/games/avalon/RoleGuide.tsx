'use client';

import { AvalonRole, type AvalonTeam } from './types';
import { ROLE_DESC_VI, ROLE_ICONS, ROLE_NAMES_VI, ROLE_TEAM } from './constants';

const ROLE_ORDER: AvalonRole[] = [
  AvalonRole.Merlin,
  AvalonRole.Percival,
  AvalonRole.LoyalServant,
  AvalonRole.Mordred,
  AvalonRole.Morgana,
  AvalonRole.Assassin,
  AvalonRole.Oberon,
  AvalonRole.Minion,
];

const ROLE_HINT: Record<AvalonRole, string> = {
  [AvalonRole.Merlin]: 'Bắt buộc · luôn có',
  [AvalonRole.Percival]: 'Tự động khi bật Morgana',
  [AvalonRole.LoyalServant]: 'Lấp chỗ trống Phe Thiện',
  [AvalonRole.Mordred]: 'Bắt buộc · luôn có',
  [AvalonRole.Morgana]: 'Vai phụ — bật trong cài đặt',
  [AvalonRole.Assassin]: 'Bắt buộc · luôn có',
  [AvalonRole.Oberon]: 'Vai phụ — bật trong cài đặt',
  [AvalonRole.Minion]: 'Lấp chỗ trống Phe Ác',
};

export default function RoleGuide() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="p-4 space-y-5">
        <RoleSection
          team="good"
          roles={ROLE_ORDER.filter((r) => ROLE_TEAM[r] === 'good')}
        />
        <RoleSection
          team="evil"
          roles={ROLE_ORDER.filter((r) => ROLE_TEAM[r] === 'evil')}
        />
      </div>
    </div>
  );
}

function RoleSection({ team, roles }: { team: AvalonTeam; roles: AvalonRole[] }) {
  const isGood = team === 'good';
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">{isGood ? '🛡️' : '🗡️'}</span>
        <h4
          className={`text-[11px] uppercase tracking-widest font-black ${isGood ? 'text-blue-300' : 'text-red-300'
            }`}
        >
          {isGood ? 'Phe Thiện' : 'Phe Ác'} ({roles.length})
        </h4>
      </div>
      <div className="space-y-2">
        {roles.map((role) => (
          <RoleCardRow key={role} role={role} />
        ))}
      </div>
    </section>
  );
}

function RoleCardRow({ role }: { role: AvalonRole }) {
  const isGood = ROLE_TEAM[role] === 'good';
  return (
    <div
      className={`rounded-xl border p-3 ${isGood ? 'border-blue-500/30 bg-blue-500/5' : 'border-red-500/30 bg-red-500/5'
        }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl shrink-0 leading-none mt-0.5">{ROLE_ICONS[role]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-sm font-black text-white">{role}</p>
            <p
              className={`text-[11px] font-bold ${isGood ? 'text-blue-300' : 'text-red-300'
                }`}
            >
              {ROLE_NAMES_VI[role]}
            </p>
          </div>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider font-bold text-slate-500">
            {ROLE_HINT[role]}
          </p>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed">
            {ROLE_DESC_VI[role]}
          </p>
        </div>
      </div>
    </div>
  );
}
