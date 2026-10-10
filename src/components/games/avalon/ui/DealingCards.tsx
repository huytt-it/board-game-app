import type { CSSProperties } from 'react';
import { CardBack } from './QuestCard';

// "Đang chia bài…": a small deck that fans out and gathers again, over and
// over, while the roles are being dealt (AvalonBoard, until this player's role
// has arrived). Purely decorative and the same on every screen; with reduced
// motion the fan simply stands open (static style = the open fan).
const FAN = [-30, -15, 0, 15, 30];

export default function DealingCards({ label = 'Đang chia bài…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center" role="status" aria-live="polite">
      <div className="relative h-36 w-40" aria-hidden>
        {FAN.map((deg, i) => (
          <div
            key={deg}
            className="av-fan absolute bottom-2 left-1/2 w-16 origin-[50%_115%]"
            style={{ '--fan': `${deg}deg`, '--i': i, transform: `translateX(-50%) rotate(${deg}deg)` } as CSSProperties}
          >
            <CardBack />
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm font-bold tracking-wide text-(--av-parchment)">{label}</p>
    </div>
  );
}
