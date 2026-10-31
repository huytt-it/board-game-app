'use client';

import { useMemo, useState } from 'react';
import type { Player } from '@/types/player';
import { describeLog } from '@/components/games/werewolf/engine/log.ts';
import WwIcon, { type IconName } from '../assets/WwIcon';
import Button from '../ui/Button';
import type { WwLogEntry } from '../types';
import { nameOf } from './shared';

// "Diễn biến ván" ở màn kết thúc (rules §5.10, plan §9 GĐ4 mục 7): kể lại theo
// từng đêm / ngày, mỗi trang một đêm hoặc một ngày, bấm Trước / Tiếp để đi qua.
// Bấm trang là việc riêng của máy mình. Mọi thứ ở đây là công khai (ván đã xong).

const KIND_ICON: Record<WwLogEntry['kind'], IconName> = {
  wolves: 'werewolf',
  guard: 'guard',
  seer: 'seer',
  witch: 'witch',
  death: 'dead',
  suspects: 'hold',
  guesses: 'hold',
  vote: 'vote',
  hunter: 'hunter',
  left: 'leave',
  lovers: 'cupid',
  elder: 'elder',
  love: 'heartbreak',
};

interface Chapter {
  label: string;
  night: boolean;
  lines: Array<{ icon: IconName; text: string }>;
}

function chaptersOf(log: readonly WwLogEntry[], players: Player[]): Chapter[] {
  const lines = describeLog(log, (id) => nameOf(players, id));
  const out: Chapter[] = [];
  lines.forEach((line, i) => {
    const label = `${line.part === 'night' ? 'Đêm' : 'Ngày'} ${line.round}`;
    const item = { icon: KIND_ICON[log[i].kind], text: line.text };
    const last = out[out.length - 1];
    if (last && last.label === label) last.lines.push(item);
    else out.push({ label, night: line.part === 'night', lines: [item] });
  });
  return out;
}

export default function EndStory({ log, players }: { log: readonly WwLogEntry[]; players: Player[] }) {
  const chapters = useMemo(() => chaptersOf(log, players), [log, players]);
  const [page, setPage] = useState(0);
  const n = chapters.length;
  const cur = Math.min(page, Math.max(0, n - 1));
  const ch = chapters[cur];
  return (
    <section
      className="rounded-2xl border border-(--ww-line) bg-(color:--ww-glass-bg) px-4 py-3 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0"
      aria-label="Diễn biến ván"
      data-ww-story=""
    >
      <div className="flex min-h-8 items-center gap-2">
        <WwIcon name="rules" size={18} className="text-(--ww-text-3)" />
        <h3 className="flex-1 text-sm font-semibold text-(--ww-text)">Diễn biến ván</h3>
        {n > 0 && (
          <span className="text-xs text-(--ww-text-3) tabular-nums" data-ww-story-page={cur + 1}>
            {cur + 1}/{n}
          </span>
        )}
      </div>
      {ch ? (
        // `key`: mỗi trang mới hiện ra nhẹ (chuyển trang cục bộ, không theo đồng hồ chung).
        <div key={cur} className="ww-a-fade mt-2 min-h-36" aria-live="polite">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-(--ww-text-2)">
            <WwIcon name={ch.night ? 'night' : 'day'} size={13} className="text-(--ww-text-3)" />
            {ch.label}
          </p>
          <ul className="space-y-1.5 text-sm leading-snug text-(--ww-text)" data-ww-log="">
            {ch.lines.map((l, j) => (
              <li key={j} className="flex items-start gap-2">
                <WwIcon name={l.icon} size={16} className="mt-0.5 text-(--ww-text-3)" />
                <span className="min-w-0 flex-1">{l.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-2 text-sm text-(--ww-text-3)">Chưa có gì.</p>
      )}
      {n > 1 && (
        <div className="mt-3 flex gap-2">
          <Button block disabled={cur === 0} onClick={() => setPage(cur - 1)}>
            ‹ Trước
          </Button>
          <Button block disabled={cur === n - 1} onClick={() => setPage(cur + 1)}>
            Tiếp ›
          </Button>
        </div>
      )}
    </section>
  );
}
