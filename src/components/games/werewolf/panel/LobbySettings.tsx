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
const ROLE_MAX: Record<WwRole, number> = { werewolf: 4, seer: 1, guard: 1, witch: 1, hunter: 1, villager: 10 };

function formatDuration(s: number): string {
  if (s < 60) return `${s} giây`;
  return s % 60 === 0 ? `${s / 60} phút` : `${Math.floor(s / 60)} phút ${s % 60} giây`;
}

function Stepper({
  label,
  name = label,
  value,
  onStep,
  disabled,
  canDown = true,
  canUp = true,
}: {
  label: string;
  /** Tên của nút cho trình đọc màn hình: "Bớt / Thêm {name}" (mặc định = label). */
  name?: string;
  value: ReactNode;
  onStep?: (dir: 1 | -1) => void;
  disabled?: boolean;
  canDown?: boolean;
  canUp?: boolean;
}) {
  const btn = 'flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xl font-bold text-slate-100 ring-1 ring-slate-600 disabled:opacity-30';
  return (
    <div className={`flex items-center gap-2 py-1 ${disabled ? 'opacity-45' : ''}`}>
      <span className="min-w-0 flex-1 text-sm text-slate-100">
        {label}
      </span>
      {onStep && (
        <button type="button" className={btn} aria-label={`Bớt ${name}`} disabled={disabled || !canDown} onClick={() => onStep(-1)}>
          −
        </button>
      )}
      <span className="w-20 text-center text-sm font-semibold tabular-nums text-slate-50">{value}</span>
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
    <div className={`py-1.5 ${disabled ? 'opacity-45' : ''}`}>
      <p className="mb-1 text-sm text-slate-100">
        {label}
      </p>
      <div className="flex gap-1.5" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            disabled={disabled || !onChange}
            onClick={() => onChange?.(o.value)}
            className={`min-h-11 flex-1 rounded-xl px-2 text-sm font-semibold ${
              value === o.value ? 'bg-indigo-500/25 text-white ring-2 ring-indigo-400' : 'bg-slate-800 text-slate-300 ring-1 ring-slate-700'
            } disabled:cursor-default`}
          >
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
        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="text-base font-semibold text-slate-50">Bộ vai</h3>
          {editable && config.roleCounts && (
            <button type="button" className="min-h-11 px-2 text-xs font-semibold text-indigo-300" onClick={() => onUpdateConfig({ roleCounts: null })}>
              Về mặc định
            </button>
          )}
        </div>
        {STEP_ROLES.map((role) => (
          <Stepper
            key={role}
            label={ROLE_NAME[role]}
            value={counts[role]}
            disabled={!editable}
            onStep={editable ? (dir) => stepRole(role, dir) : undefined}
            canDown={counts[role] > 0}
            canUp={counts[role] < ROLE_MAX[role]}
          />
        ))}
        <Stepper label={`${ROLE_NAME.villager} (phần còn lại)`} value={counts.villager} />
        <p className="mt-2 text-sm text-slate-300" data-ww-balance={score}>
          Điểm cân bằng: <span className="font-semibold tabular-nums text-slate-50">{score > 0 ? `+${score}` : score}</span> ·{' '}
          {BALANCE_LEAN_TEXT[balanceLean(score)]}
        </p>
        {warning && <p className="mt-1 text-sm font-semibold text-amber-300">{warning}</p>}
      </section>

      <section>
        <h3 className="mb-1 text-base font-semibold text-slate-50">Luật</h3>
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
        <h3 className="mb-1 text-base font-semibold text-slate-50">Thời gian</h3>
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
        <p className="mt-1 text-xs text-slate-400">Bình minh và Kết quả phiếu: 8 giây (cố định).</p>
      </section>
    </div>
  );
}
