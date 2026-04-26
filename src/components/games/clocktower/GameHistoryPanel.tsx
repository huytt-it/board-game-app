'use client';

import type { GameHistoryEvent, GameHistoryEventType, ResultState } from '@/types/history';

interface GameHistoryPanelProps {
  events: GameHistoryEvent[];
}

// ─── Group events by day + phase ──────────────────────────────────────
function groupByDayAndPhase(events: GameHistoryEvent[]) {
  const groups: {
    label: string;
    phase: 'night' | 'day';
    dayCount: number;
    events: GameHistoryEvent[];
  }[] = [];

  for (const event of events) {
    if (event.type === 'phase_change') continue;

    const label =
      event.dayCount === 0
        ? event.phase === 'night'
          ? 'Đêm đầu tiên'
          : 'Ngày 1'
        : `${event.phase === 'night' ? 'Đêm' : 'Ngày'} ${event.dayCount}`;

    const key = `${event.dayCount}-${event.phase}`;
    let group = groups.find((g) => `${g.dayCount}-${g.phase}` === key);
    if (!group) {
      group = { label, phase: event.phase, dayCount: event.dayCount, events: [] };
      groups.push(group);
    }
    group.events.push(event);
  }

  groups.sort((a, b) => {
    if (a.dayCount !== b.dayCount) return a.dayCount - b.dayCount;
    return a.phase === 'night' ? -1 : 1;
  });

  return groups;
}

// ─── Visual config per event type ─────────────────────────────────────
const TYPE_STYLE: Record<
  GameHistoryEventType,
  { border: string; bg: string; dot: string }
> = {
  night_action:  { border: 'border-purple-500/30', bg: 'bg-purple-900/20',   dot: 'bg-purple-500' },
  night_death:   { border: 'border-red-500/30',    bg: 'bg-red-900/20',      dot: 'bg-red-500' },
  execution:     { border: 'border-amber-500/30',  bg: 'bg-amber-900/20',    dot: 'bg-amber-500' },
  ability_used:  { border: 'border-cyan-500/30',   bg: 'bg-cyan-900/20',     dot: 'bg-cyan-500' },
  state_change:  { border: 'border-teal-500/30',   bg: 'bg-teal-900/20',     dot: 'bg-teal-500' },
  host_decision: { border: 'border-indigo-500/30', bg: 'bg-indigo-900/20',   dot: 'bg-indigo-500' },
  note:          { border: 'border-slate-500/30',  bg: 'bg-slate-800/30',    dot: 'bg-slate-500' },
  phase_change:  { border: 'border-white/10',      bg: 'bg-white/5',         dot: 'bg-slate-500' },
};

// ─── ResultState badge ─────────────────────────────────────────────────
const RESULT_STATE_BADGE: Record<ResultState, { label: string; className: string }> = {
  poisoned:        { label: '☠️ Bị nhiễm độc',        className: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' },
  poison_cleared:  { label: '✅ Hết nhiễm độc',        className: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' },
  protected:       { label: '🛡️ Được bảo vệ',          className: 'bg-green-500/20 text-green-300 border border-green-500/30' },
  master_assigned: { label: '🎩 Chủ nhân được chọn',   className: 'bg-teal-500/20 text-teal-300 border border-teal-500/30' },
  killed:          { label: '💀 Đã giết',               className: 'bg-red-500/20 text-red-300 border border-red-500/30' },
  miss:            { label: '✗ Bắn trượt',             className: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' },
  executed:        { label: '⚖️ Bị xử tử',             className: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
  pardoned:        { label: '🕊️ Tha bổng',             className: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' },
  approved:        { label: '✓ Chấp thuận',            className: 'bg-green-500/20 text-green-300 border border-green-500/30' },
  rejected:        { label: '✗ Từ chối',               className: 'bg-red-500/20 text-red-300 border border-red-500/30' },
};

function ResultBadge({ state }: { state: ResultState }) {
  const cfg = RESULT_STATE_BADGE[state];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ─── Player chip (name + optional role) ───────────────────────────────
function PlayerChip({ name, role }: { name: string; role?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-xs text-slate-200 font-medium">
      {role && <span className="text-slate-400">{role}</span>}
      {name}
    </span>
  );
}

// ─── Single event card ─────────────────────────────────────────────────
function EventCard({ event }: { event: GameHistoryEvent }) {
  const style = TYPE_STYLE[event.type] ?? TYPE_STYLE.note;
  const hasActor = !!event.actorName;
  const hasTarget = !!event.targetName;
  const hasSecond = !!event.secondTargetName;

  return (
    <div className={`rounded-lg border p-3 text-sm ${style.border} ${style.bg}`}>
      {/* Title row */}
      <div className="flex items-start gap-2">
        <span className="text-base shrink-0 leading-none mt-0.5">{event.emoji}</span>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="font-semibold text-white leading-snug">{event.title}</p>

          {/* Actor → Target chain */}
          {(hasActor || hasTarget) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {hasActor && <PlayerChip name={event.actorName!} role={event.actorRole} />}
              {hasActor && hasTarget && <span className="text-slate-600 text-xs">→</span>}
              {hasTarget && <PlayerChip name={event.targetName!} role={event.targetRole} />}
              {hasSecond && (
                <>
                  <span className="text-slate-600 text-xs">&amp;</span>
                  <PlayerChip name={event.secondTargetName!} role={event.secondTargetRole} />
                </>
              )}
            </div>
          )}

          {/* Result state badge */}
          {event.resultState && (
            <div>
              <ResultBadge state={event.resultState} />
            </div>
          )}

          {/* Detail text */}
          {event.detail && (
            <p className="text-xs text-slate-400 leading-relaxed">{event.detail}</p>
          )}

          {/* Message sent to player */}
          {event.messageSent && (
            <div className="rounded bg-black/20 border border-white/5 px-2 py-1 mt-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Thông tin gửi người chơi</p>
              <p className="text-xs text-slate-300 italic">"{event.messageSent}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main panel ────────────────────────────────────────────────────────
export default function GameHistoryPanel({ events }: GameHistoryPanelProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl bg-white/5 px-4 py-10 text-center text-sm text-slate-500">
        📜 Lịch sử ván đấu sẽ xuất hiện ở đây...
      </div>
    );
  }

  const groups = groupByDayAndPhase(events);

  // Count only non-phase-change events for the summary bar
  const counts = {
    night_action:  events.filter((e) => e.type === 'night_action').length,
    state_change:  events.filter((e) => e.type === 'state_change').length,
    night_death:   events.filter((e) => e.type === 'night_death').length,
    execution:     events.filter((e) => e.type === 'execution').length,
    ability_used:  events.filter((e) => e.type === 'ability_used').length,
    host_decision: events.filter((e) => e.type === 'host_decision').length,
  };

  return (
    <div className="space-y-1">
      {/* Summary bar */}
      <div className="mb-4 flex flex-wrap gap-2">
        {counts.night_action > 0 && (
          <span className="rounded-full bg-purple-500/15 px-2.5 py-1 text-[10px] font-bold text-purple-300 border border-purple-500/20">
            🎯 {counts.night_action} hành động đêm
          </span>
        )}
        {counts.state_change > 0 && (
          <span className="rounded-full bg-teal-500/15 px-2.5 py-1 text-[10px] font-bold text-teal-300 border border-teal-500/20">
            🔄 {counts.state_change} thay đổi trạng thái
          </span>
        )}
        {counts.ability_used > 0 && (
          <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 text-[10px] font-bold text-cyan-300 border border-cyan-500/20">
            ⚡ {counts.ability_used} kỹ năng ngày
          </span>
        )}
        {counts.night_death > 0 && (
          <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-bold text-red-300 border border-red-500/20">
            💀 {counts.night_death} cái chết
          </span>
        )}
        {counts.execution > 0 && (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-300 border border-amber-500/20">
            ⚖️ {counts.execution} xử tử
          </span>
        )}
        {counts.host_decision > 0 && (
          <span className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-[10px] font-bold text-indigo-300 border border-indigo-500/20">
            👁 {counts.host_decision} quyết định QT
          </span>
        )}
      </div>

      {/* Grouped timeline */}
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={`${group.dayCount}-${group.phase}`}>
            {/* Group header */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-lg">{group.phase === 'night' ? '🌙' : '☀️'}</span>
              <h4 className={`text-sm font-bold uppercase tracking-widest ${
                group.phase === 'night' ? 'text-indigo-300' : 'text-amber-300'
              }`}>
                {group.label}
              </h4>
              <div className={`h-px flex-1 ${
                group.phase === 'night' ? 'bg-indigo-500/20' : 'bg-amber-500/20'
              }`} />
              <span className="text-[10px] text-slate-600">{group.events.length} sự kiện</span>
            </div>

            {/* Timeline */}
            <div className="relative ml-4 border-l-2 border-white/10 space-y-0">
              {group.events.map((event) => {
                const style = TYPE_STYLE[event.type] ?? TYPE_STYLE.note;
                return (
                  <div key={event.id} className="relative pl-5 pb-3">
                    <div className={`absolute -left-[7px] top-2 h-3 w-3 rounded-full border-2 border-slate-900 ${style.dot}`} />
                    <EventCard event={event} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
