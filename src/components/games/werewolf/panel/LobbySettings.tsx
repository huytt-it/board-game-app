'use client';

import type { ReactNode } from 'react';
import {
  BALANCE_LEAN_TEXT,
  ROLE_NAME,
  balanceLean,
  balanceScore,
  balanceWarning,
} from '@/components/games/werewolf/engine/roles.ts';
import { lobbyCounts, type WwConfig } from '../state';
import { PHASE_SECONDS_LIMITS, TIMED_PHASES, type RoleCounts, type TimedPhase, type WerewolfRoomConfig, type WwRole, type WwRules } from '../types';
import WwIcon, { type IconName } from '../assets/WwIcon';

// Cài đặt phòng (plan §4.4, rules §8): bộ vai, luật tuỳ chọn, thời gian các
// bước. Chủ phòng chỉnh bằng −/+; người khác xem ở dạng chỉ đọc. Mọi thứ cố
// định khi bắt đầu ván.

const PHASE_LABEL: Record<TimedPhase, string> = {
  deal: 'Xem vai',
  night: 'Đêm ①',
  'night-witch': 'Đêm ② (Phù thủy)',
  hunter: 'Thợ săn',
  'day-talk': 'Thảo luận',
  'day-vote': 'Bỏ phiếu',
};

const STEP_ROLES: readonly WwRole[] = ['werewolf', 'seer', 'guard', 'witch', 'hunter'];
// Vai mở rộng chưa có stepper ở sảnh (GĐ5b); mỗi vai tối đa 1 người (rules §4).
const ROLE_MAX: Record<WwRole, number> = {
  werewolf: 4,
  seer: 1,
  guard: 1,
  witch: 1,
  hunter: 1,
  villager: 10,
  elder: 1,
  lycan: 1,
  minion: 1,
  tanner: 1,
  cupid: 1,
  wolfcub: 1,
};

function formatDuration(s: number): string {
  if (s < 60) return `${s} giây`;
  return s % 60 === 0 ? `${s / 60} phút` : `${Math.floor(s / 60)} phút ${s % 60} giây`;
}

function Stepper({
  label,
  icon,
  name = label,
  value,
  onStep,
  disabled,
  canDown = true,
  canUp = true,
}: {
  label: string;
  icon?: IconName;
  /** Tên của nút cho trình đọc màn hình: "Bớt / Thêm {name}" (mặc định = label). */
  name?: string;
  value: ReactNode;
  onStep?: (dir: 1 | -1) => void;
  disabled?: boolean;
  canDown?: boolean;
  canUp?: boolean;
}) {
  const btn =
    'flex size-11 shrink-0 items-center justify-center rounded-xl border border-(--ww-line) bg-(--ww-raised) text-xl font-bold text-(--ww-text) enabled:hover:bg-(--ww-raised-hi) disabled:opacity-30';
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-(--ww-text)">
        {icon && <WwIcon name={icon} size={18} className="text-(--ww-text-3)" />}
        {label}
      </span>
      {onStep && (
        <button type="button" className={btn} aria-label={`Bớt ${name}`} disabled={disabled || !canDown} onClick={() => onStep(-1)}>
          −
        </button>
      )}
      <span className="w-20 text-center text-sm font-semibold text-(--ww-text) tabular-nums">{value}</span>
      {onStep && (
        <button type="button" className={btn} aria-label={`Thêm ${name}`} disabled={disabled || !canUp} onClick={() => onStep(1)}>
          +
        </button>
      )}
    </div>
  );
}

function Choice({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: Array<{ value: string; text: string }>;
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="py-1.5">
      <p className="mb-1.5 text-sm text-(--ww-text)">{label}</p>
      {/* Một khối chọn, không viền từng ô: ô đang chọn là mặt nổi sáng hơn (không dùng màu nhấn). */}
      <div className="flex gap-1 rounded-xl bg-(--ww-ink) p-1" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            disabled={disabled || !onChange}
            onClick={() => onChange?.(o.value)}
            className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold disabled:cursor-default ${
              value === o.value ? 'bg-(--ww-raised-hi) text-(--ww-text) shadow-md shadow-black/30' : 'text-(--ww-text-3)'
            }`}
          >
            {value === o.value && <WwIcon name="check" size={14} />}
            {o.text}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LobbySettings({
  config,
  playerCount,
  editable,
  onUpdateConfig,
}: {
  config: WwConfig;
  playerCount: number;
  editable: boolean;
  onUpdateConfig: (next: Partial<WerewolfRoomConfig>) => void;
}) {
  const counts = lobbyCounts(config.roleCounts, playerCount);
  const score = balanceScore(counts);
  const warning = balanceWarning(counts);
  const edit = editable ? onUpdateConfig : undefined;

  const stepRole = (role: WwRole, dir: 1 | -1) => {
    const next: RoleCounts = { werewolf: counts.werewolf, seer: counts.seer, guard: counts.guard, witch: counts.witch, hunter: counts.hunter };
    next[role] = Math.min(ROLE_MAX[role], Math.max(0, (next[role] ?? 0) + dir));
    edit?.({ roleCounts: next });
  };
  const setRule = <K extends keyof WwRules>(key: K, value: WwRules[K]) => edit?.({ rules: { ...config.rules, [key]: value } });
  const stepTime = (phase: TimedPhase, dir: 1 | -1) => {
    const { min, max, step } = PHASE_SECONDS_LIMITS[phase];
    const cur = config.phaseSeconds[phase];
    const next = Math.min(max, Math.max(min, cur + dir * step));
    if (next !== cur) edit?.({ phaseSeconds: { ...config.phaseSeconds, [phase]: next } });
  };

  return (
    <div className="space-y-5" data-ww-settings={editable ? 'host' : 'read-only'}>
      <section>
        <div className="mb-1 flex min-h-11 items-center justify-between">
          <h3 className="text-base font-semibold text-(--ww-text)">Bộ vai</h3>
          {editable && config.roleCounts && (
            <button
              type="button"
              className="min-h-11 rounded-xl px-2 text-xs font-semibold text-(--ww-text-2) underline underline-offset-4 hover:text-(--ww-text)"
              onClick={() => onUpdateConfig({ roleCounts: null })}
            >
              Về mặc định
            </button>
          )}
        </div>
        {STEP_ROLES.map((role) => (
          <Stepper
            key={role}
            label={ROLE_NAME[role]}
            icon={role}
            value={counts[role]}
            disabled={!editable}
            onStep={editable ? (dir) => stepRole(role, dir) : undefined}
            canDown={counts[role] > 0}
            canUp={counts[role] < ROLE_MAX[role]}
          />
        ))}
        <Stepper label={`${ROLE_NAME.villager} (phần còn lại)`} icon="villager" value={counts.villager} />
        <p className="mt-2 text-sm text-(--ww-text-2)" data-ww-balance={score}>
          Điểm cân bằng: <span className="font-semibold text-(--ww-text) tabular-nums">{score > 0 ? `+${score}` : score}</span> ·{' '}
          {BALANCE_LEAN_TEXT[balanceLean(score)]}
        </p>
        {warning && (
          <p className="mt-1 flex items-start gap-1.5 text-sm font-semibold text-(--ww-wolf-light)">
            <WwIcon name="warning" size={16} className="mt-0.5" />
            {warning}
          </p>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-base font-semibold text-(--ww-text)">Luật</h3>
        <Choice
          label="Lộ vai khi chết"
          value={config.rules.revealOnDeath ? 'on' : 'off'}
          options={[
            { value: 'on', text: 'Bật' },
            { value: 'off', text: 'Tắt' },
          ]}
          onChange={edit ? (v) => setRule('revealOnDeath', v === 'on') : undefined}
        />
        <Choice
          label="Sói hoà phiếu"
          value={config.rules.wolfTie}
          options={[
            { value: 'random', text: 'Ngẫu nhiên' },
            { value: 'none', text: 'Không cắn' },
          ]}
          onChange={edit ? (v) => setRule('wolfTie', v === 'none' ? 'none' : 'random') : undefined}
        />
        <Choice
          label="Hồn ma xem hết vai"
          value={config.rules.ghostsSeeAll ? 'on' : 'off'}
          options={[
            { value: 'on', text: 'Bật' },
            { value: 'off', text: 'Tắt' },
          ]}
          onChange={edit ? (v) => setRule('ghostsSeeAll', v === 'on') : undefined}
        />
        <Choice
          label="Thợ săn bị độc vẫn được bắn"
          value={config.rules.hunterShootsWhenPoisoned ? 'on' : 'off'}
          options={[
            { value: 'on', text: 'Bật' },
            { value: 'off', text: 'Tắt' },
          ]}
          onChange={edit ? (v) => setRule('hunterShootsWhenPoisoned', v === 'on') : undefined}
        />
      </section>

      <section>
        <h3 className="mb-1 text-base font-semibold text-(--ww-text)">Thời gian</h3>
        {TIMED_PHASES.map((phase) => {
          const { min, max } = PHASE_SECONDS_LIMITS[phase];
          const v = config.phaseSeconds[phase];
          return (
            <Stepper
              key={phase}
              label={PHASE_LABEL[phase]}
              // "Thợ săn" là cả tên vai lẫn tên bước: nút thời gian phải khác tên.
              name={`thời gian ${PHASE_LABEL[phase]}`}
              value={formatDuration(v)}
              disabled={!editable}
              onStep={editable ? (dir) => stepTime(phase, dir) : undefined}
              canDown={v > min}
              canUp={v < max}
            />
          );
        })}
        <p className="mt-1 text-xs text-(--ww-text-3)">Bình minh và Kết quả phiếu: 8 giây (cố định).</p>
      </section>
    </div>
  );
}
