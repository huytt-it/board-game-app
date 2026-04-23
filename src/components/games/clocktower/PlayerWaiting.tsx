'use client';

interface PlayerWaitingProps {
  message?: string;
}

export default function PlayerWaiting({ message = 'The night is dark and full of whispers...' }: PlayerWaitingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      {/* Moon animation */}
      <div className="relative">
        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-400 shadow-lg shadow-yellow-500/30">
          {/* Craters */}
          <div className="absolute left-4 top-3 h-4 w-4 rounded-full bg-yellow-300/60" />
          <div className="absolute left-12 top-8 h-3 w-3 rounded-full bg-yellow-300/40" />
          <div className="absolute left-6 top-14 h-5 w-5 rounded-full bg-yellow-300/50" />
        </div>
        {/* Stars */}
        <div className="absolute -left-6 -top-2 h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
        <div className="absolute -right-4 top-0 h-1 w-1 animate-pulse rounded-full bg-white delay-300" />
        <div className="absolute -left-3 bottom-2 h-1 w-1 animate-pulse rounded-full bg-white delay-700" />
        <div className="absolute -right-8 bottom-6 h-1.5 w-1.5 animate-pulse rounded-full bg-white delay-500" />
      </div>

      {/* Waiting text */}
      <div className="text-center">
        <h3 className="mb-2 text-lg font-semibold text-white">Night Phase</h3>
        <p className="animate-pulse text-sm text-slate-400">{message}</p>
      </div>

      {/* Animated dots */}
      <div className="flex gap-1.5">
        <div className="h-2 w-2 animate-bounce rounded-full bg-purple-500" style={{ animationDelay: '0ms' }} />
        <div className="h-2 w-2 animate-bounce rounded-full bg-purple-500" style={{ animationDelay: '150ms' }} />
        <div className="h-2 w-2 animate-bounce rounded-full bg-purple-500" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
