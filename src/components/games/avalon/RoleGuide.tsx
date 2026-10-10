'use client';

import { AvalonRole, type AvalonTeam } from './types';
import { ROLE_DESC_VI, ROLE_NAMES_VI, ROLE_TEAM } from './constants';
import { TEAM_ICON_NAME } from './presentation';
import AvIcon from './assets/AvIcon';
import RoleEmblem from './ui/RoleEmblem';

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
  [AvalonRole.LoyalServant]: 'Lấp chỗ trống Phe Người',
  [AvalonRole.Mordred]: 'Bắt buộc · luôn có',
  [AvalonRole.Morgana]: 'Vai phụ — bật trong cài đặt',
  [AvalonRole.Assassin]: 'Bắt buộc · luôn có',
  [AvalonRole.Oberon]: 'Vai phụ — bật trong cài đặt',
  [AvalonRole.Minion]: 'Lấp chỗ trống Phe Quỷ',
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
      <p className="border-t border-white/10 px-4 py-2 text-[10px] leading-relaxed text-slate-500">
        Icon: Lorc, Delapouite, Sbed —{' '}
        <a
          href="https://game-icons.net"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-300"
        >
          game-icons.net
        </a>
        , giấy phép{' '}
        <a
          href="https://creativecommons.org/licenses/by/3.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-300"
        >
          CC BY 3.0
        </a>
        .
      </p>
    </div>
  );
}

function RoleSection({ team, roles }: { team: AvalonTeam; roles: AvalonRole[] }) {
  const isGood = team === 'good';
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <AvIcon name={TEAM_ICON_NAME[team]} size={18} className={isGood ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'} />
        <h4
          className={`text-[11px] uppercase tracking-widest font-black ${isGood ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'
            }`}
        >
          {isGood ? 'Phe Người' : 'Phe Quỷ'} ({roles.length})
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
      className={`rounded-xl border p-3 ${isGood ? 'border-(--av-good)/35 bg-(--av-good)/5' : 'border-(--av-evil)/35 bg-(--av-evil)/5'
        }`}
    >
      <div className="flex items-start gap-3">
        <RoleEmblem role={role} size="md" className="mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="av-display text-lg leading-tight text-white">{role}</p>
            <p
              className={`text-[11px] font-bold ${isGood ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'
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
