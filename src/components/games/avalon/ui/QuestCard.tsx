import AvIcon from '../assets/AvIcon';

// A quest card. Face down every card is IDENTICAL — same back, same colour,
// whoever played it and whatever it is (ux-plan 2.4): the pile on the table,
// the card flying into it and the row before it is turned over all use this.
// Face up (only in the public reveal of quest-result) it shows its side.
//
// Sized by the parent (`className` sets width; the card keeps a 5:7 ratio).

export function CardBack({ className = '' }: { className?: string }) {
  return (
    <div
      className={`av-card flex aspect-[5/7] items-center justify-center border-2 border-(--av-gold)/70 bg-(--av-ink) shadow-md shadow-black/60 ${className}`}
    >
      <div className="av-card flex h-[82%] w-[76%] items-center justify-center border border-(--av-gold)/35 bg-[radial-gradient(circle_at_50%_40%,rgba(212,166,74,0.18),transparent_65%)]">
        <AvIcon name="avalon" className="h-[46%] w-[46%] text-(--av-gold)/80" size="auto" />
      </div>
    </div>
  );
}

export function CardFace({ side, className = '' }: { side: 'success' | 'fail'; className?: string }) {
  const good = side === 'success';
  return (
    <div
      className={`av-card flex aspect-[5/7] flex-col items-center justify-center gap-[6%] border-2 shadow-md shadow-black/60 ${
        good ? 'border-(--av-good) bg-[#16203a]' : 'border-(--av-evil) bg-[#3a1616]'
      } ${className}`}
    >
      <AvIcon
        name={good ? 'quest-success' : 'quest-fail'}
        size="auto"
        className={`h-[44%] w-[60%] ${good ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'}`}
      />
    </div>
  );
}
