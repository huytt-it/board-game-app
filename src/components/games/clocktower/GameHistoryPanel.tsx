'use client';

import type { GameHistoryEvent } from '@/types/history';

interface GameHistoryPanelProps {
  events: GameHistoryEvent[];
}

function groupByDayAndPhase(events: GameHistoryEvent[]) {
  const groups: { label: string; phase: 'night' | 'day'; dayCount: number; events: GameHistoryEvent[] }[] = [];

  for (const event of events) {
    if (event.type === 'phase_change') continue; // shown as separators

    const label =
      event.dayCount === 0
        ? event.phase === 'night' ? 'Đêm đầu tiên' : 'Ngày 1'
        : `${event.phase === 'night' ? 'Đêm' : 'Ngày'} ${event.dayCount + (event.phase === 'night' ? 0 : 0)}`;

    const key = `${event.dayCount}-${event.phase}`;
    let group = groups.find((g) => `${g.dayCount}-${g.phase}` === key);
    if (!group) {
      group = { label, phase: event.phase, dayCount: event.dayCount, events: [] };
      groups.push(group);
    }
    group.events.push(event);
  }

  // Sort groups: day 0 night, day 1 night, day 1 day, day 2 night, etc.
  groups.sort((a, b) => {
    if (a.dayCount !== b.dayCount) return a.dayCount - b.dayCount;
    // night before day for same dayCount
    return a.phase === 'night' ? -1 : 1;
  });

  return groups;
}

const EVENT_COLORS: Record<string, string> = {
  night_action:  'border-purple-500/30 bg-purple-500/10',
  night_death:   'border-red-500/30 bg-red-500/10',
  execution:     'border-amber-500/30 bg-amber-500/10',
  note:          'border-slate-500/30 bg-slate-500/10',
  phase_change:  'border-indigo-500/30 bg-indigo-500/10',
};

export default function GameHistoryPanel({ events }: GameHistoryPanelProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl bg-white/5 px-4 py-10 text-center text-sm text-slate-500">
        📜 Lịch sử ván đấu sẽ xuất hiện ở đây...
      </div>
    );
  }

  const groups = groupByDayAndPhase(events);

  return (
    <div className="space-y-6">
      {groups.map((group, gi) => (
        <div key={`${group.dayCount}-${group.phase}`}>
          {/* Group header */}
          <div className={`flex items-center gap-3 mb-3`}>
            <span className="text-lg">{group.phase === 'night' ? '🌙' : '☀️'}</span>
            <h4 className={`text-sm font-bold uppercase tracking-widest ${
              group.phase === 'night' ? 'text-indigo-300' : 'text-amber-300'
            }`}>
              {group.label}
            </h4>
            <div className={`h-px flex-1 ${group.phase === 'night' ? 'bg-indigo-500/20' : 'bg-amber-500/20'}`} />
          </div>

          {/* Events in this group */}
          <div className="relative ml-4 border-l-2 border-white/10 space-y-0">
            {group.events.map((event, ei) => (
              <div key={event.id} className="relative pl-5 pb-3">
                {/* Timeline dot */}
                <div className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-slate-900 ${
                  event.type === 'night_death' ? 'bg-red-500' :
                  event.type === 'execution' ? 'bg-amber-500' :
                  event.type === 'night_action' ? 'bg-purple-500' :
                  'bg-slate-500'
                }`} />

                <div className={`rounded-lg border p-3 text-sm ${EVENT_COLORS[event.type] || EVENT_COLORS.note}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-base shrink-0">{event.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white leading-tight">{event.title}</p>
                      {event.detail && (
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{event.detail}</p>
                      )}
                      {/* Actor → Target */}
                      {(event.actorName || event.targetName) && (
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          {event.actorName && (
                            <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-slate-300 font-medium">
                              {event.actorRole ? `${event.actorRole} ` : ''}{event.actorName}
                            </span>
                          )}
                          {event.actorName && event.targetName && (
                            <span className="text-slate-600 text-xs">→</span>
                          )}
                          {event.targetName && (
                            <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-slate-300 font-medium">
                              {event.targetRole ? `${event.targetRole} ` : ''}{event.targetName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
