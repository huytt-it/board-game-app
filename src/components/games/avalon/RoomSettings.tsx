'use client';

import type { RoomConfig } from '@/types/room';
import { AvalonRole, PHASE_SECONDS_LIMITS, TIMED_PHASES, type LadyTimeoutMode, type TimedPhase } from './types';
import {
  ALL_OPTIONAL_ROLES,
  REQUIRED_ROLES,
  ROLE_DESC_VI,
  ROLE_TEAM,
  TEAM_DISTRIBUTION,
  PLAYER_COUNTS,
  type SupportedPlayerCount,
} from './constants';
import AvIcon from './assets/AvIcon';
import AvButton from './ui/AvButton';
import RoleEmblem from './ui/RoleEmblem';

interface RoomSettingsProps {
  config: RoomConfig;
  onUpdateConfig: (next: Partial<RoomConfig>) => void;
  playerCount: number;
  /** Seconds per adjustable phase, already read and clamped (useAvalon readConfig). */
  phaseSeconds?: Record<TimedPhase, number>;
  ladyTimeoutMode?: LadyTimeoutMode;
}

const PHASE_LABEL: Record<TimedPhase, string> = {
  'team-build': 'Chọn đội',
  'team-vote': 'Bỏ phiếu',
  'quest-play': 'Đặt lá',
  discussion: 'Thảo luận',
  'lady-of-lake': 'Lady',
  assassinate: 'Sát Thủ',
};

const DEFAULT_SECONDS = Object.fromEntries(TIMED_PHASES.map((p) => [p, PHASE_SECONDS_LIMITS[p].def])) as Record<TimedPhase, number>;

// "30 giây", "10 phút"; an odd number of seconds stays in seconds ("75 giây").
function formatDuration(s: number): string {
  return s >= 60 && s % 60 === 0 ? `${s / 60} phút` : `${s} giây`;
}

const LADY_MODES: { mode: LadyTimeoutMode; title: string; note: string }[] = [
  { mode: 'skip', title: 'Bỏ lượt', note: 'Không soi ai; Lady chuyển ngẫu nhiên cho người chưa từng cầm.' },
  { mode: 'random', title: 'Soi ngẫu nhiên', note: 'Hệ thống soi người đang được ngắm (hoặc một người ngẫu nhiên); người cầm xem kết quả 10 giây.' },
  { mode: 'wait', title: 'Dừng lại chờ', note: 'Ván dừng tới khi người cầm soi; chủ phòng có thể bỏ lượt hoặc soi ngẫu nhiên thay.' },
];

// The host's settings (in ui/Modal): sections separated by rules, the modal is
// the only frame. An optional role is a `choice` row — a gold edge and a gold
// switch when it is on. GĐ8: the Lady's timeout (3 choices) and the length of
// six phases (a −/+ stepper each), both fixed when a game starts.
export default function RoomSettings({
  config,
  onUpdateConfig,
  playerCount,
  phaseSeconds = DEFAULT_SECONDS,
  ladyTimeoutMode = 'skip',
}: RoomSettingsProps) {
  const optionalRoles =
    (config.optionalRoles as AvalonRole[] | undefined) ?? [];
  const maxPlayers = config.maxPlayers ?? 10;

  const isSupported = (PLAYER_COUNTS as readonly number[]).includes(playerCount);
  const dist = isSupported ? TEAM_DISTRIBUTION[playerCount as SupportedPlayerCount] : null;

  const requiredGoodCount = REQUIRED_ROLES.filter((r) => ROLE_TEAM[r] === 'good').length;
  const requiredEvilCount = REQUIRED_ROLES.filter((r) => ROLE_TEAM[r] === 'evil').length;

  const goodOptional = optionalRoles.filter((r) => ROLE_TEAM[r] === 'good');
  const evilOptional = optionalRoles.filter((r) => ROLE_TEAM[r] === 'evil');
  const goodOptionalLimit = dist ? Math.max(0, dist.good - requiredGoodCount) : 0;
  const evilOptionalLimit = dist ? Math.max(0, dist.evil - requiredEvilCount) : 0;

  const toggleRole = (role: AvalonRole) => {
    const team = ROLE_TEAM[role];
    const enabled = optionalRoles.includes(role);
    if (enabled) {
      onUpdateConfig({ optionalRoles: optionalRoles.filter((r) => r !== role) });
      return;
    }
    const limit = team === 'good' ? goodOptionalLimit : evilOptionalLimit;
    const sameTeamCount = optionalRoles.filter((r) => ROLE_TEAM[r] === team).length;
    if (sameTeamCount >= limit) return;
    onUpdateConfig({ optionalRoles: [...optionalRoles, role] });
  };

  const isAtLimitFor = (role: AvalonRole): boolean => {
    if (optionalRoles.includes(role)) return false;
    const team = ROLE_TEAM[role];
    const limit = team === 'good' ? goodOptionalLimit : evilOptionalLimit;
    const sameTeamCount = optionalRoles.filter((r) => ROLE_TEAM[r] === team).length;
    return sameTeamCount >= limit;
  };

  const setMax = (val: number) => {
    // Không cho hạ maxPlayers xuống thấp hơn số player ĐANG ngồi trong phòng,
    // tránh trường hợp UI hiển thị "8/6" và assignRoles vẫn chia theo playerCount
    // thực tế (gây lệch với cấu hình). Cận trên/dưới của Avalon: 5-10.
    const lowerBound = Math.max(5, playerCount);
    const next = Math.min(10, Math.max(lowerBound, val));
    onUpdateConfig({ maxPlayers: next });
  };

  const morgana = optionalRoles.includes(AvalonRole.Morgana);
  const team = (isGood: boolean) => (isGood ? 'text-(--av-good-light)' : 'text-(--av-evil-light)');

  // The Lady comes into a game of 7 or more: her settings show when the room
  // can get there.
  const ladyPossible = maxPlayers >= 7 || playerCount >= 7;
  const timedPhases = TIMED_PHASES.filter((p) => p !== 'lady-of-lake' || ladyPossible);
  const stepTime = (phase: TimedPhase, dir: 1 | -1) => {
    const { min, max, step } = PHASE_SECONDS_LIMITS[phase];
    const next = Math.min(max, Math.max(min, phaseSeconds[phase] + dir * step));
    if (next !== phaseSeconds[phase]) onUpdateConfig({ phaseSeconds: { ...phaseSeconds, [phase]: next } });
  };
  const allDefault = TIMED_PHASES.every((p) => phaseSeconds[p] === DEFAULT_SECONDS[p]);

  return (
    <div className="divide-y divide-(--av-line) [&>section]:py-5 [&>section:first-child]:pt-0 [&>section:last-child]:pb-0">
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-base font-semibold text-(--av-text)">Số người tối đa</h3>
          <span className="text-xs text-(--av-text-3)">
            Đang có <span className="font-semibold text-(--av-text)">{playerCount}</span> / {maxPlayers}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <AvButton variant="secondary" onClick={() => setMax(maxPlayers - 1)} aria-label="Bớt 1 người" className="w-11">
            <span className="text-xl leading-none">−</span>
          </AvButton>
          <div className="flex-1 text-center">
            <span className="text-4xl font-bold tabular-nums text-(--av-text)">{maxPlayers}</span>
            <span className="ml-1 text-sm text-(--av-text-3)">người</span>
          </div>
          <AvButton variant="secondary" onClick={() => setMax(maxPlayers + 1)} aria-label="Thêm 1 người" className="w-11">
            <span className="text-xl leading-none">+</span>
          </AvButton>
        </div>
        <p className="mt-2 text-center text-xs text-(--av-text-3)">Avalon hỗ trợ 5–10 người chơi</p>
        {dist && (
          <p className="mt-3 text-center text-sm text-(--av-text-2)">
            {playerCount} người:{' '}
            <span className={`font-semibold ${team(true)}`}>
              <AvIcon name="team-good" /> {dist.good} Phe Người
            </span>{' '}
            ·{' '}
            <span className={`font-semibold ${team(false)}`}>
              <AvIcon name="team-evil" /> {dist.evil} Phe Quỷ
            </span>
          </p>
        )}
      </section>

      <section>
        <h3 className="text-base font-semibold text-(--av-text)">Vai bắt buộc</h3>
        <p className="mb-3 mt-0.5 text-xs text-(--av-text-3)">{REQUIRED_ROLES.length} vai luôn có trong mỗi ván — không thể tắt.</p>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
          {REQUIRED_ROLES.map((role) => {
            const isGood = ROLE_TEAM[role] === 'good';
            return (
              <li key={role} className="flex min-w-0 items-center gap-2">
                <RoleEmblem role={role} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-(--av-text)">{role}</p>
                  <p className={`text-xs ${team(isGood)}`}>{isGood ? 'Người' : 'Quỷ'} · luôn có</p>
                </div>
                <AvIcon name="lock" size={16} className="shrink-0 text-(--av-text-3)" />
              </li>
            );
          })}
          <li className={`col-span-2 flex min-w-0 items-center gap-2 ${morgana ? '' : 'opacity-70'}`}>
            <RoleEmblem role={AvalonRole.Percival} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-(--av-text)">{AvalonRole.Percival}</p>
              <p className={`text-xs ${team(true)}`}>
                Người · {morgana ? 'tự động có khi bật Morgana' : 'chỉ xuất hiện nếu Morgana được bật'}
              </p>
            </div>
            {morgana ? (
              <AvIcon name="check" size={16} className="shrink-0 text-(--av-gold)" />
            ) : (
              <span className="h-4 w-4 shrink-0 rounded-full border-2 border-(--av-text-3)" aria-hidden="true" />
            )}
          </li>
        </ul>
      </section>

      <section>
        <h3 className="text-base font-semibold text-(--av-text)">Vai phụ</h3>
        <p className="mt-0.5 text-xs text-(--av-text-3)">Bật theo số người chơi. Bật vai sẽ thay 1 Trung Thần / Tay Sai mặc định.</p>
        <ul className="mb-3 mt-2 space-y-0.5 text-xs leading-relaxed text-(--av-text-2)">
          <li>• 5–6 người: chưa mở vai phụ Quỷ (đủ Mordred + Sát Thủ)</li>
          <li>
            • 7–9 người: mở 1 vai (Morgana <em>hoặc</em> Oberon)
          </li>
          <li>
            • 10 người: mở cả hai (Morgana <em>và</em> Oberon)
          </li>
        </ul>

        <div className="space-y-2">
          {ALL_OPTIONAL_ROLES.map((role) => {
            const enabled = optionalRoles.includes(role);
            const isGood = ROLE_TEAM[role] === 'good';
            const atLimit = isAtLimitFor(role);
            return (
              <AvButton
                key={role}
                variant="choice"
                block
                align="start"
                selected={enabled}
                aria-pressed={enabled}
                onClick={() => toggleRole(role)}
                disabled={atLimit}
                className="py-3 text-left"
              >
                <RoleEmblem role={role} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-semibold text-(--av-text)">{role}</span>
                    <span className={`text-xs ${team(isGood)}`}>{isGood ? 'Người' : 'Quỷ'}</span>
                  </span>
                  {atLimit && (
                    <span className="block text-xs font-normal text-(--av-evil-light)">
                      <AvIcon name="warning" /> Chưa đủ chỗ cho vai này
                    </span>
                  )}
                  <span className="mt-0.5 line-clamp-2 block text-xs font-normal leading-snug text-(--av-text-2)">{ROLE_DESC_VI[role]}</span>
                </span>
                {/* The switch: gold when the role is on. */}
                <span
                  aria-hidden
                  className={`flex h-6 w-11 shrink-0 items-center rounded-full border px-0.5 transition-colors ${
                    enabled ? 'justify-end border-(--av-gold) bg-(--av-gold)' : 'justify-start border-(--av-line) bg-white/6'
                  }`}
                >
                  <span className={`h-5 w-5 rounded-full shadow-md ${enabled ? 'bg-(--av-ink)' : 'bg-(--av-text-2)'}`} />
                </span>
              </AvButton>
            );
          })}
        </div>

        <p className="mt-2 text-xs text-(--av-text-3)">
          Phe Người: {goodOptional.length}/{goodOptionalLimit} vai phụ · Phe Quỷ: {evilOptional.length}/{evilOptionalLimit} vai phụ
        </p>
        {evilOptionalLimit === 0 && goodOptionalLimit === 0 && (
          <p className="mt-2 text-xs text-(--av-evil-light)">
            <AvIcon name="warning" /> Số người hiện tại chỉ đủ cho các vai bắt buộc — chưa có chỗ cho vai phụ.
          </p>
        )}
      </section>

      <section>
        <h3 className="text-base font-semibold text-(--av-text)">Luật tuỳ chọn</h3>
        <div className={`mt-2 flex items-center gap-3 ${playerCount >= 7 ? '' : 'opacity-70'}`}>
          <AvIcon name="lady" size={26} className="shrink-0 text-(--av-lady)" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-(--av-text)">Lady of the Lake</p>
            <p className="text-xs leading-snug text-(--av-text-2)">
              {playerCount >= 7
                ? 'Tự động bật từ 7 người. Sau Quest 2/3/4, người cầm token chọn 1 người để soi phe.'
                : `Cần ≥ 7 người (hiện ${playerCount}) — sẽ tự bật khi đủ.`}
            </p>
          </div>
          <span className={`shrink-0 text-xs font-semibold ${playerCount >= 7 ? 'text-(--av-gold)' : 'text-(--av-text-3)'}`}>
            {playerCount >= 7 ? (
              <>
                <AvIcon name="lock" /> Tự bật
              </>
            ) : (
              'Tắt'
            )}
          </span>
        </div>

        {ladyPossible && (
          <div className="mt-4" data-lady-timeout-setting="">
            <p className="text-sm font-semibold text-(--av-text)" id="lady-timeout-label">
              Lady hết giờ mà chưa soi
            </p>
            <p className="mt-0.5 text-xs text-(--av-text-3)">Cả bàn luôn được báo chuyện gì đã xảy ra.</p>
            <div role="radiogroup" aria-labelledby="lady-timeout-label" className="mt-2 space-y-2">
              {LADY_MODES.map(({ mode, title, note }) => {
                const on = ladyTimeoutMode === mode;
                return (
                  <AvButton
                    key={mode}
                    variant="choice"
                    block
                    align="start"
                    selected={on}
                    role="radio"
                    aria-checked={on}
                    aria-pressed={undefined}
                    onClick={() => !on && onUpdateConfig({ ladyTimeoutMode: mode })}
                    className="py-3 text-left"
                    data-lady-mode={mode}
                  >
                    {/* The radio dot: gold when chosen. */}
                    <span
                      aria-hidden
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-(--av-gold)' : 'border-(--av-text-3)'}`}
                    >
                      {on && <span className="h-2.5 w-2.5 rounded-full bg-(--av-gold)" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-(--av-text)">
                        {title}
                        {mode === 'skip' && <span className="ml-1.5 text-xs font-normal text-(--av-text-3)">mặc định</span>}
                      </span>
                      <span className="mt-0.5 block text-xs font-normal leading-snug text-(--av-text-2)">{note}</span>
                    </span>
                  </AvButton>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section data-time-settings="">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-(--av-text)">Thời gian</h3>
          <AvButton
            variant="ghost"
            icon="new-game"
            onClick={() => onUpdateConfig({ phaseSeconds: DEFAULT_SECONDS })}
            disabled={allDefault}
            title="Đặt lại mọi thời gian về mặc định"
          >
            Mặc định
          </AvButton>
        </div>
        <p className="mt-0.5 text-xs text-(--av-text-3)">Chốt lúc bắt đầu ván. Xem kết quả (8 giây), đêm và lộ vai không đổi.</p>
        <ul className="mt-3 space-y-2">
          {timedPhases.map((phase) => {
            const { min, max } = PHASE_SECONDS_LIMITS[phase];
            const value = phaseSeconds[phase];
            const label = PHASE_LABEL[phase];
            return (
              <li key={phase} className="flex items-center gap-3" data-time-row={phase} data-seconds={value}>
                <span className="min-w-0 flex-1 text-sm text-(--av-text)">{label}</span>
                <AvButton variant="secondary" onClick={() => stepTime(phase, -1)} disabled={value <= min} aria-label={`Bớt thời gian ${label}`} className="w-11">
                  <span className="text-xl leading-none">−</span>
                </AvButton>
                <span className="w-20 text-center text-sm font-semibold tabular-nums text-(--av-text)" aria-live="polite">
                  {formatDuration(value)}
                </span>
                <AvButton variant="secondary" onClick={() => stepTime(phase, 1)} disabled={value >= max} aria-label={`Thêm thời gian ${label}`} className="w-11">
                  <span className="text-xl leading-none">+</span>
                </AvButton>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
