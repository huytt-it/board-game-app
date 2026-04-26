'use client';

interface PlayerWaitingProps {
  message?: string;
}

export default function PlayerWaiting({
  message = 'Màn đêm đang bao phủ...',
}: PlayerWaitingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-10">
      {/* Moon */}
      <div className="relative">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-400 shadow-lg shadow-yellow-400/30">
          <div className="absolute left-3 top-2 h-3 w-3 rounded-full bg-yellow-200/70" />
          <div className="absolute left-8 top-5 h-2 w-2 rounded-full bg-yellow-200/50" />
          <div className="absolute left-4 top-9 h-3.5 w-3.5 rounded-full bg-yellow-200/60" />
        </div>
        {/* Stars */}
        <div className="absolute -left-5 -top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-white opacity-80" />
        <div className="absolute -right-4 top-0 h-1 w-1 animate-pulse rounded-full bg-white opacity-60 delay-300" />
        <div className="absolute -left-2 bottom-0 h-1 w-1 animate-pulse rounded-full bg-white opacity-60 delay-700" />
        <div className="absolute -right-7 bottom-4 h-1.5 w-1.5 animate-pulse rounded-full bg-white opacity-50 delay-500" />
      </div>

      {/* Message */}
      <p className="animate-pulse text-center text-sm leading-relaxed text-slate-400 px-4">
        {message}
      </p>

      {/* Dots */}
      <div className="flex gap-1.5">
        {[0, 150, 300].map((delay) => (
          <div
            key={delay}
            className="h-2 w-2 animate-bounce rounded-full bg-purple-500"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
