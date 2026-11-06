'use client';

import { useState, type ReactNode } from 'react';
import {
  ALL_ROLES,
  BALANCE_LEAN_TEXT,
  EXTRA_ROLES,
  ROLE_BLURB,
  ROLE_NAME,
  SPECIAL_ROLES,
  balanceLean,
  balanceScore,
  balanceWarning,
  presetFor,
} from '@/components/games/werewolf/engine/roles.ts';
import { lobbyCounts, type WwConfig } from '../state';
import {
  PACE_LABEL,
  PACE_SECONDS,
  PACES,
  PHASE_SECONDS_LIMITS,
  paceOf,
  type Pace,
  type RoleCounts,
  type TimedPhase,
  type WerewolfRoomConfig,
  type WwRole,
  type WwRules,
} from '../types';
import WwIcon from '../assets/WwIcon';
import Chip from '../ui/Chip';

// Cài đặt phòng (plan §4.4 + §10c, rules §8): bộ vai, luật tuỳ chọn, nhịp ván.
// Chủ phòng chỉnh; người khác chỉ thấy tóm tắt (không có nút bị khoá). Mọi thứ
// cố định khi bắt đầu ván.
//  - Bộ vai: số Sói là stepper duy nhất; mọi vai đặc biệt là ô chạm bật / tắt.
//  - Luật, Thời gian: khối gọn có dòng tóm tắt, chạm để mở.
//  - Thời gian: ba nhịp đặt sẵn; Tuỳ chỉnh (mặc định đóng) mới có stepper.

// Mỗi vai đặc biệt / vai mở rộng tối đa 1 người (rules §4, E55). Số Sói thật
// sự bị chặn bởi validateSetup (2 × Sói < số người).
const ROLE_MAX: Record<WwRole, number> = {
  werewolf: 5,
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

const PHASE_LABEL: Record<TimedPhase, string> = {
  deal: 'Xem vai',
  night: 'Ban đêm',
  'night-witch': 'Phù thủy',
  hunter: 'Thợ săn bắn',
  'day-talk': 'Thảo luận',
  'day-vote': 'Bỏ phiếu',
};

function formatDuration(s: number): string {
  if (s < 60) return `${s} giây`;
  return s % 60 === 0 ? `${s / 60} phút` : `${Math.floor(s / 60)} phút ${s % 60} giây`;
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

function Stepper({
  label,
  hint,
  name = label,
  value,
  onStep,
  canDown = true,
  canUp = true,
}: {
  label: string;
  /** Dòng nhỏ dưới nhãn (vd. "đề xuất: 3"). */
  hint?: string;
  /** Tên của nút cho trình đọc màn hình: "Bớt / Thêm {name}" (mặc định = label). */
  name?: string;
  value: ReactNode;
  onStep: (dir: 1 | -1) => void;
  canDown?: boolean;
  canUp?: boolean;
}) {
  const btn =
    'flex size-11 shrink-0 items-center justify-center rounded-xl border border-(--ww-line) bg-(--ww-raised) text-xl font-bold text-(--ww-text) enabled:hover:bg-(--ww-raised-hi) disabled:opacity-30';
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-0 flex-1 text-sm text-(--ww-text)">
        {label}
        {hint && <span className="block text-xs text-(--ww-text-3)">{hint}</span>}
      </span>
      <button type="button" className={btn} aria-label={`Bớt ${name}`} disabled={!canDown} onClick={() => onStep(-1)}>
        −
      </button>
      <span className="w-20 text-center text-sm font-semibold text-(--ww-text) tabular-nums">{value}</span>
      <button type="button" className={btn} aria-label={`Thêm ${name}`} disabled={!canUp} onClick={() => onStep(1)}>
        +
      </button>
    </div>
  );
}

/** Một vai đặc biệt: ô chạm bật / tắt (bật = viền màu nhấn + ✓). */
function RoleTile({ role, on, dense, onToggle }: { role: WwRole; on: boolean; /** Ba ô một hàng: ở màn rất hẹp bỏ icon vai để tên và dấu ✓ không đè nhau. */ dense: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ROLE_NAME[role]}
      data-ww-role-tile={role}
      onClick={onToggle}
      className={`relative flex min-h-14 items-center gap-1.5 rounded-xl px-2 text-left text-sm font-semibold leading-tight ${
        on ? 'bg-(--ww-raised-hi) text-(--ww-text) ring-2 ring-(--ww-accent)' : 'border border-(--ww-line) bg-(--ww-ink) text-(--ww-text-3)'
      }`}
    >
      <span className={`shrink-0 ${dense ? 'max-[359px]:hidden' : ''}`} aria-hidden="true">
        <WwIcon name={role} size={18} />
      </span>
      <span className="min-w-0 flex-1">{ROLE_NAME[role]}</span>
      {on && <WwIcon name="check" size={14} className="shrink-0 text-(--ww-accent)" />}
    </button>
  );
}

function RoleGroup({ title, roles, cols, counts, onToggle, onInfo }: { title: string; roles: readonly WwRole[]; cols: 2 | 3; counts: Record<WwRole, number>; onToggle: (r: WwRole) => void; onInfo: (r: WwRole) => void }) {
  return (
    <div data-ww-role-group={title}>
      <p className="mb-1.5 text-xs font-semibold text-(--ww-text-3)">{title}</p>
      <div className={`grid gap-2 ${cols === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {roles.map((role) => (
          <RoleTile
            key={role}
            role={role}
            on={counts[role] > 0}
            dense={cols === 3}
            onToggle={() => {
              onInfo(role);
              onToggle(role);
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Công tắc một dòng (Luật). */
function RuleSwitch({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onToggle} className="flex min-h-11 w-full items-center gap-3 text-left text-sm text-(--ww-text)">
      <span className="min-w-0 flex-1">{label}</span>
      <span
        aria-hidden="true"
        className={`flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 ${on ? 'justify-end bg-(--ww-accent)' : 'justify-start border border-(--ww-line) bg-(--ww-ink)'}`}
      >
        <span className={`size-5 rounded-full ${on ? 'bg-(--ww-ink)' : 'bg-(--ww-text-3)'}`} />
      </span>
    </button>
  );
}

/** Khối gọn: tiêu đề + dòng tóm tắt, chạm để mở. */
function Fold({ id, title, summary, open, onToggle, children }: { id: string; title: string; summary: ReactNode; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <section className="border-t border-(--ww-line)" data-ww-fold={id} data-ww-open={open ? 'yes' : 'no'}>
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex min-h-14 w-full items-center gap-2 py-2 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-(--ww-text)">{title}</span>
          <span className="block text-xs leading-snug text-(--ww-text-2)">{summary}</span>
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 text-(--ww-text-3) ${open ? 'rotate-180' : ''}`}>
          <path d="M3 6l5 5 5-5" />
        </svg>
      </button>
      {open && <div className="pb-2">{children}</div>}
    </section>
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
  const [open, setOpen] = useState<'rules' | 'time' | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  // Vai vừa chạm: một dòng mô tả (mô tả đầy đủ ở màn Luật chơi).
  const [info, setInfo] = useState<WwRole | null>(null);
  const toggleFold = (k: 'rules' | 'time') => setOpen((o) => (o === k ? null : k));

  const specials = [...SPECIAL_ROLES, ...EXTRA_ROLES].filter((r) => counts[r] > 0);
  const summary = `${playerCount} người = ${counts.werewolf} Sói · ${specials.length} vai đặc biệt · ${counts.villager} Dân`;
  const balance = `Cân bằng ${signed(score)} · ${BALANCE_LEAN_TEXT[balanceLean(score)]}`;
  const recommended = presetFor(playerCount)?.werewolf;

  const pace = paceOf(config.phaseSeconds);
  // Chỉ những bước ván có thật (rules §8.3).
  const shownPhases = (Object.keys(PHASE_LABEL) as TimedPhase[]).filter((p) => (p === 'night-witch' ? counts.witch > 0 : p === 'hunter' ? counts.hunter > 0 : true));
  const ps = config.phaseSeconds;
  const timeSummary = `${pace ? PACE_LABEL[pace] : 'Tuỳ chỉnh'} · Đêm ${formatDuration(ps.night)} · Thảo luận ${formatDuration(ps['day-talk'])} · Bỏ phiếu ${formatDuration(ps['day-vote'])}`;

  const ruleItems: Array<{ key: keyof WwRules; label: string; short: string; on: boolean; set: (v: boolean) => void }> = [
    { key: 'revealOnDeath', label: 'Lộ vai khi chết', short: 'Lộ vai khi chết', on: config.rules.revealOnDeath, set: (v) => setRule('revealOnDeath', v) },
    { key: 'ghostsSeeAll', label: 'Hồn ma xem hết vai', short: 'Hồn ma xem hết vai', on: config.rules.ghostsSeeAll, set: (v) => setRule('ghostsSeeAll', v) },
    { key: 'wolfTie', label: 'Sói hoà phiếu thì không cắn', short: 'Hoà thì không cắn', on: config.rules.wolfTie === 'none', set: (v) => setRule('wolfTie', v ? 'none' : 'random') },
    // "Thợ săn bị độc…" chỉ có nghĩa khi có cả Thợ săn lẫn Phù thủy.
    ...(counts.hunter > 0 && counts.witch > 0
      ? [{ key: 'hunterShootsWhenPoisoned' as const, label: 'Thợ săn bị độc vẫn được bắn', short: 'Thợ săn bị độc vẫn bắn', on: config.rules.hunterShootsWhenPoisoned, set: (v: boolean) => setRule('hunterShootsWhenPoisoned', v) }]
      : []),
  ];
  const onRules = ruleItems.filter((r) => r.on);
  const ruleSummary = onRules.length > 0 ? onRules.map((r) => r.short).join(' · ') : 'Không bật luật nào';

  function setRole(role: WwRole, n: number) {
    // Ghi mọi vai trừ Dân (Dân luôn = số người − các vai khác: lobbyCounts).
    const next: RoleCounts = Object.fromEntries(ALL_ROLES.filter((r) => r !== 'villager').map((r) => [r, counts[r]]));
    next[role] = Math.min(ROLE_MAX[role], Math.max(0, n));
    onUpdateConfig({ roleCounts: next });
  }
  function setRule<K extends keyof WwRules>(key: K, value: WwRules[K]) {
    onUpdateConfig({ rules: { ...config.rules, [key]: value } });
  }
  function stepTime(phase: TimedPhase, dir: 1 | -1) {
    const { min, max, step } = PHASE_SECONDS_LIMITS[phase];
    const cur = config.phaseSeconds[phase];
    const next = Math.min(max, Math.max(min, cur + dir * step));
    if (next !== cur) onUpdateConfig({ phaseSeconds: { ...config.phaseSeconds, [phase]: next } });
  }
  const pickPace = (p: Pace) => {
    setCustomOpen(false);
    onUpdateConfig({ phaseSeconds: { ...PACE_SECONDS[p] } });
  };

  const header = (
    <div data-ww-summary="">
      <p className="text-base font-semibold text-(--ww-text)">{summary}</p>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-(--ww-text-2)" data-ww-balance={score}>
          {balance}
        </p>
        {editable && config.roleCounts && (
          <button
            type="button"
            className="min-h-11 shrink-0 rounded-xl px-2 text-xs font-semibold text-(--ww-text-2) underline underline-offset-4 hover:text-(--ww-text)"
            onClick={() => onUpdateConfig({ roleCounts: null })}
          >
            Về mặc định
          </button>
        )}
      </div>
      {warning && (
        <p className="mt-1 flex items-start gap-1.5 text-sm font-semibold text-(--ww-wolf-light)">
          <WwIcon name="warning" size={16} className="mt-0.5 shrink-0" />
          {warning}
        </p>
      )}
    </div>
  );

  // ── Người không phải chủ phòng: tóm tắt chỉ đọc ──────────────────────────
  if (!editable) {
    const inGame = ALL_ROLES.filter((r) => r !== 'villager' && counts[r] > 0);
    return (
      <div className="space-y-3" data-ww-settings="read-only">
        {header}
        <ul className="flex flex-wrap gap-1.5" aria-label="Vai trong ván" data-ww-role-chips="">
          {inGame.map((r) => (
            <li key={r}>
              <Chip icon={r}>{r === 'werewolf' && counts[r] > 1 ? `${ROLE_NAME[r]} ×${counts[r]}` : ROLE_NAME[r]}</Chip>
            </li>
          ))}
        </ul>
        <p className="text-sm text-(--ww-text-2)" data-ww-pace-line="">
          <span className="font-semibold text-(--ww-text)">Nhịp ván:</span> {timeSummary}
        </p>
        <p className="text-sm text-(--ww-text-2)" data-ww-rules-line="">
          <span className="font-semibold text-(--ww-text)">Luật:</span> {ruleSummary}
        </p>
      </div>
    );
  }

  // ── Chủ phòng ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3" data-ww-settings="host">
      <section data-ww-roles="">
        {header}
        <div className="mt-2">
          <Stepper
            label="Số Sói"
            name={ROLE_NAME.werewolf}
            hint={recommended != null ? `đề xuất: ${recommended}` : undefined}
            value={counts.werewolf}
            onStep={(dir) => setRole('werewolf', counts.werewolf + dir)}
            canDown={counts.werewolf > 0}
            canUp={counts.werewolf < ROLE_MAX.werewolf}
          />
        </div>
        <div className="mt-2 space-y-2">
          <RoleGroup title="Cơ bản" cols={2} roles={SPECIAL_ROLES} counts={counts} onInfo={setInfo} onToggle={(r) => setRole(r, counts[r] > 0 ? 0 : 1)} />
          <RoleGroup title="Mở rộng" cols={3} roles={EXTRA_ROLES} counts={counts} onInfo={setInfo} onToggle={(r) => setRole(r, counts[r] > 0 ? 0 : 1)} />
        </div>
        <p className="mt-2 text-xs leading-snug text-(--ww-text-2)" aria-live="polite" data-ww-role-info={info ?? ''}>
          {info ? (
            <>
              <span className="font-semibold text-(--ww-text)">{ROLE_NAME[info]}:</span> {ROLE_BLURB[info]}
            </>
          ) : (
            'Chạm một vai để bật / tắt. Dân làng là phần còn lại.'
          )}
        </p>
      </section>

      <Fold id="rules" title="Luật" summary={ruleSummary} open={open === 'rules'} onToggle={() => toggleFold('rules')}>
        {ruleItems.map((r) => (
          <RuleSwitch key={r.key} label={r.label} on={r.on} onToggle={() => r.set(!r.on)} />
        ))}
      </Fold>

      <Fold id="time" title="Thời gian" summary={timeSummary} open={open === 'time'} onToggle={() => toggleFold('time')}>
        <div className="flex gap-1 rounded-xl bg-(--ww-ink) p-1" role="radiogroup" aria-label="Nhịp ván">
          {PACES.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={pace === p}
              onClick={() => pickPace(p)}
              className={`flex min-h-11 flex-1 items-center justify-center rounded-lg px-1 text-sm font-semibold ${pace === p ? 'bg-(--ww-raised-hi) text-(--ww-text) shadow-md shadow-black/30' : 'text-(--ww-text-3)'}`}
            >
              {PACE_LABEL[p]}
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={pace === null}
            data-ww-custom-open={customOpen || pace === null ? 'yes' : 'no'}
            onClick={() => setCustomOpen((o) => !o)}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-lg px-1 text-sm font-semibold ${pace === null ? 'bg-(--ww-raised-hi) text-(--ww-text) shadow-md shadow-black/30' : 'text-(--ww-text-3)'}`}
          >
            Tuỳ chỉnh
          </button>
        </div>
        {(customOpen || pace === null) && (
          <div className="mt-2 space-y-1" data-ww-custom-time="">
            {shownPhases.map((phase) => {
              const { min, max } = PHASE_SECONDS_LIMITS[phase];
              const v = config.phaseSeconds[phase];
              return (
                <Stepper
                  key={phase}
                  label={PHASE_LABEL[phase]}
                  // "Thợ săn" là cả tên vai lẫn tên bước: nút thời gian phải khác tên.
                  name={`thời gian ${PHASE_LABEL[phase]}`}
                  value={formatDuration(v)}
                  onStep={(dir) => stepTime(phase, dir)}
                  canDown={v > min}
                  canUp={v < max}
                />
              );
            })}
          </div>
        )}
        <p className="mt-2 text-xs text-(--ww-text-3)">Bình minh và Kết quả phiếu: 8 giây (cố định).</p>
      </Fold>
    </div>
  );
}
