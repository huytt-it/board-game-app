'use client';

export default function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-purple-500" />
        <div className="absolute inset-1 animate-spin-reverse rounded-full border-2 border-transparent border-t-cyan-400" />
      </div>
      <p className="animate-pulse text-sm text-slate-400">{text}</p>
    </div>
  );
}
