'use client';

import { AvalonRole, type AvalonTeam } from './types';
import { ROLE_DESC_VI, ROLE_NAMES_VI, ROLE_TEAM } from './constants';
import { ROLE_DISPLAY_ORDER, TEAM_ICON_NAME } from './presentation';
import AvIcon from './assets/AvIcon';
import RoleEmblem from './ui/RoleEmblem';

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

// The lobby's role guide (in ui/Modal): every role, Good then Evil, as rows
// separated by rules — the modal is the only frame.
export default function RoleGuide() {
  return (
    <div className="space-y-6">
      <RoleSection team="good" roles={ROLE_DISPLAY_ORDER.filter((r) => ROLE_TEAM[r] === 'good')} />
      <RoleSection team="evil" roles={ROLE_DISPLAY_ORDER.filter((r) => ROLE_TEAM[r] === 'evil')} />
      <p className="border-t border-(--av-line) pt-3 text-xs leading-relaxed text-(--av-text-3)">
        Icon: Lorc, Delapouite, Sbed —{' '}
        <a href="https://game-icons.net" target="_blank" rel="noopener noreferrer" className="underline hover:text-(--av-text)">
          game-icons.net
        </a>
        , giấy phép{' '}
        <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer" className="underline hover:text-(--av-text)">
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
      <h3 className={`mb-1 flex items-center gap-2 text-base font-semibold ${isGood ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'}`}>
        <AvIcon name={TEAM_ICON_NAME[team]} size={18} />
        {isGood ? 'Phe Người' : 'Phe Quỷ'} ({roles.length})
      </h3>
      <ul className="divide-y divide-(--av-line)">
        {roles.map((role) => (
          <RoleCardRow key={role} role={role} />
        ))}
      </ul>
    </section>
  );
}

function RoleCardRow({ role }: { role: AvalonRole }) {
  const isGood = ROLE_TEAM[role] === 'good';
  return (
    <li className="flex items-start gap-3 py-3">
      <RoleEmblem role={role} size="md" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="av-display text-lg leading-tight text-(--av-text)">{role}</p>
          <p className={`text-xs font-semibold ${isGood ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'}`}>{ROLE_NAMES_VI[role]}</p>
        </div>
        <p className="mt-0.5 text-xs text-(--av-text-3)">{ROLE_HINT[role]}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-(--av-text-2)">{ROLE_DESC_VI[role]}</p>
      </div>
    </li>
  );
}
