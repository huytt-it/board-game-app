'use client';

import type { AvalonRole } from '../types';
import { ROLE_DESC_VI, ROLE_NAMES_VI, ROLE_TEAM, TEAM_NAME_VI } from '../constants';
import { TEAM_ICON_NAME } from '../presentation';
import { useHold } from '../hooks/useHold';
import { useCue } from '../hooks/useCue';
import AvIcon from '../assets/AvIcon';
import AvButton from './AvButton';
import RoleEmblem from './RoleEmblem';

// The viewer's role as a letter under a wax seal. Press and HOLD the letter to
// read it — the flap lifts, the seal breaks and the page rises; let go and it
// folds back. Until someone holds, the letter is pixel-for-pixel the same for
// every role (no name, no colour, no size difference), so a neighbour glancing
// at the screen learns nothing (ux-plan 2.4). The team shows only as a small
// label inside the letter.
//
// `startedAt` (role reveal): the letter drops in and the seal is pressed,
// cued from the phase start on the server clock, so a reload does not replay
// it (useCue). Without it (the "my role" modal) it simply appears.
export default function RoleLetter({
  role,
  startedAt,
  footer,
}: {
  role: AvalonRole;
  startedAt?: number | null;
  /** A line at the bottom of the open letter. */
  footer?: React.ReactNode;
}) {
  const { held, bind } = useHold();
  const cue = useCue(startedAt ?? 0);
  const intro = startedAt != null;
  const team = ROLE_TEAM[role];

  return (
    <div className="flex w-full flex-col items-center">
      {/* A drawn object that is pressed (AvButton `bare`): no look of its own. */}
      <AvButton
        variant="bare"
        {...bind}
        data-letter={held ? 'open' : 'sealed'}
        className="av-hold av-letter h-[min(25rem,calc(100dvh-15.5rem))] min-h-[18rem] w-full max-w-[20rem] cursor-pointer overflow-hidden rounded-2xl"
      >
        {!held && <span className="sr-only">Nhấn giữ để đọc vai của bạn</span>}
        {/* The envelope, centred in the stage. */}
        <span
          className={`absolute inset-x-1 top-1/2 block aspect-[10/7] -translate-y-1/2 ${intro ? 'av-letter-in' : ''}`}
          style={intro ? { animationDelay: cue(0) } : undefined}
          aria-hidden
        >
          <span className="av-envelope-back absolute inset-0 rounded-xl" />
          <svg viewBox="0 0 100 70" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            {/* Front pocket with its two folds. */}
            <path d="M0 22 50 44 100 22V68a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2Z" fill="#dcc79c" />
            <path d="M0 68 42 40M100 68 58 40" fill="none" stroke="#b3965e" strokeWidth="0.6" />
          </svg>
          <span className="av-letter-flap absolute inset-x-0 top-0 block h-[62%]">
            <svg viewBox="0 0 100 43" preserveAspectRatio="none" className="h-full w-full">
              <path d="M0 0H100L52 41.5a3 3 0 0 1-4 0Z" fill="#cfb684" stroke="#b3965e" strokeWidth="0.6" />
            </svg>
          </span>
          {/* The wax seal. */}
          <span
            className={`absolute left-1/2 top-[60%] block aspect-square w-[24%] -translate-x-1/2 -translate-y-1/2 ${intro ? 'av-seal-press' : ''}`}
            style={intro ? { animationDelay: cue(600) } : undefined}
          >
            <span className="av-letter-seal flex h-full w-full items-center justify-center rounded-full">
              <AvIcon name="avalon" size="auto" className="h-[58%] w-[58%] text-[#5c3a10]/80" />
            </span>
          </span>
        </span>

        {/* The letter itself. Present only while held (`visibility`), so
            nothing of it is painted — or read out — for the neighbours. */}
        <span className="av-letter-sheet absolute inset-0 flex flex-col items-center rounded-2xl px-5 py-4 text-center">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border border-current/25 px-2.5 py-0.5 text-xs font-bold tracking-wide ${
              team === 'good' ? 'text-(--av-good-ink)' : 'text-(--av-evil-ink)'
            }`}
          >
            <AvIcon name={TEAM_ICON_NAME[team]} /> {TEAM_NAME_VI[team]}
          </span>
          <span className="mt-3 flex justify-center">
            <RoleEmblem role={role} size="lg" tone="neutral" />
          </span>
          {/* One line for every role (see RoleEmblem / ux-plan 2.11). */}
          <span className="av-display mt-2 block whitespace-nowrap text-[min(2rem,8vw)] leading-tight text-(--av-ink)">{role}</span>
          <span className="block text-sm font-bold text-(--av-ink)/75">{ROLE_NAMES_VI[role]}</span>
          <span className="mt-3 block text-sm leading-relaxed text-(--av-ink)">{ROLE_DESC_VI[role]}</span>
          {footer && <span className="mt-auto block pt-2 text-xs italic leading-snug text-(--av-ink)/70">{footer}</span>}
        </span>
      </AvButton>
      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-(--av-text-2)">
        <AvIcon name="eye" /> Nhấn giữ lá thư để đọc — thả tay là thư gấp lại
      </p>
    </div>
  );
}
