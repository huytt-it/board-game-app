'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GameModuleProps } from '@/lib/gameRegistry';
import QRCodeDisplay from '@/components/core/QRCodeDisplay';
import { readPlayerData, CARD_DEFS, LEGAL_GOODS, PHASE_LABELS } from './constants';
import { readGameState, useSheriff } from './useSheriff';
import type { LegalCategory, SheriffGameState } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Card Chip
// ─────────────────────────────────────────────────────────────────────────────
function CardChip({
  category,
  size = 'md',
  selected,
  onClick,
  badge,
}: {
  category: string;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  onClick?: () => void;
  badge?: string | number;
}) {
  const def = CARD_DEFS[category as keyof typeof CARD_DEFS];
  if (!def) return null;
  const sizeClass = size === 'sm' ? 'px-2 py-1 text-xs' : size === 'lg' ? 'px-4 py-3 text-base' : 'px-3 py-2 text-sm';
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative flex flex-col items-center gap-0.5 rounded-xl border font-medium transition-all duration-150',
        sizeClass,
        def.bgClass, def.borderClass, def.textClass,
        selected
          ? `ring-2 ring-white/70 shadow-lg ${def.glowClass} scale-105`
          : onClick ? 'hover:scale-105 hover:shadow-md active:scale-95 cursor-pointer' : 'cursor-default',
        'select-none',
      ].join(' ')}
    >
      <span className={size === 'sm' ? 'text-base' : 'text-2xl'}>{def.icon}</span>
      {size !== 'sm' && (
        <span className="text-[10px] opacity-70 leading-none">{def.nameVI}</span>
      )}
      {badge !== undefined && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-amber-400 text-slate-900 text-[9px] font-bold flex items-center justify-center px-1">
          {badge}
        </span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Gold Badge
// ─────────────────────────────────────────────────────────────────────────────
function GoldBadge({ amount, className = '' }: { amount: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-sm font-bold text-amber-300 ${className}`}>
      🪙 {amount}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Phase Banner
// ─────────────────────────────────────────────────────────────────────────────
function PhaseBanner({ phase, round, totalRounds, sheriffName }: {
  phase: string; round: number; totalRounds: number; sheriffName: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-white">{PHASE_LABELS[phase] ?? phase}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-400">
          Vòng {round}/{totalRounds}
        </span>
      </div>
      <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1">
        <span className="text-amber-400 text-sm">⚖️</span>
        <span className="text-xs font-semibold text-amber-300">{sheriffName}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Player Status Row
// ─────────────────────────────────────────────────────────────────────────────
function PlayerStatusList({
  players,
  gameState,
  myId,
}: {
  players: { id: string; name: string }[];
  gameState: SheriffGameState;
  myId: string;
}) {
  const statusFor = (id: string) => {
    const phase = gameState.phase;
    if (id === gameState.sheriffPlayerId) return { icon: '⚖️', label: 'Sheriff', color: 'text-amber-300' };
    if (phase === 'market') return gameState.marketReady?.[id] ? { icon: '✅', label: 'Xong', color: 'text-green-400' } : { icon: '🛒', label: 'Đổi hàng', color: 'text-slate-400' };
    if (phase === 'load_bag') return gameState.bagConfirmed?.[id] ? { icon: '✅', label: 'Đã đóng', color: 'text-green-400' } : { icon: '👝', label: 'Đóng túi', color: 'text-slate-400' };
    if (phase === 'declare') return gameState.declarationDone?.[id] ? { icon: '✅', label: 'Đã khai', color: 'text-green-400' } : { icon: '📣', label: 'Khai báo', color: 'text-slate-400' };
    if (phase === 'inspect') {
      if (gameState.bagRevealed?.[id]) return { icon: '🔓', label: 'Xong', color: 'text-green-400' };
      if (gameState.currentInspectTarget === id) return { icon: '🔍', label: 'Đang kiểm', color: 'text-yellow-300' };
      return { icon: '⏳', label: 'Chờ', color: 'text-slate-500' };
    }
    return { icon: '•', label: '', color: 'text-slate-500' };
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {players.map((p) => {
        const s = statusFor(p.id);
        return (
          <div key={p.id} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${p.id === myId ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-white/10 bg-white/5'}`}>
            <span>{s.icon}</span>
            <span className={`font-medium ${p.id === myId ? 'text-cyan-300' : 'text-slate-300'}`}>
              {p.id === myId ? `${p.name} (bạn)` : p.name}
            </span>
            {s.label && <span className={`${s.color}`}>· {s.label}</span>}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Market Phase
// ─────────────────────────────────────────────────────────────────────────────
function MarketPhase({
  hand,
  onConfirm,
  isReady,
}: {
  hand: string[];
  onConfirm: (indices: number[]) => Promise<void>;
  isReady: boolean;
}) {
  const [toDiscard, setToDiscard] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = (i: number) => {
    setToDiscard((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : prev.length < 5 ? [...prev, i] : prev,
    );
  };

  const handleConfirm = async () => {
    setLoading(true);
    try { await onConfirm(toDiscard); } finally { setLoading(false); }
  };

  const keepIndices = hand.map((_, i) => i).filter((i) => !toDiscard.includes(i));

  if (isReady) {
    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 text-center">
        <div className="text-4xl mb-2">✅</div>
        <p className="text-green-400 font-semibold">Đã xác nhận đổi hàng</p>
        <p className="text-slate-500 text-sm mt-1">Chờ các người chơi khác...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Instructions */}
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-300">
        Nhấn vào lá bài để đổi lấy bài mới từ chồng rút. Tối đa 5 lá.
      </div>

      {/* Full hand — click to mark as discard */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-400">🃏 Tay bài của bạn ({hand.length} lá)</h3>
          {toDiscard.length > 0 && (
            <button onClick={() => setToDiscard([])} className="text-xs text-slate-500 hover:text-slate-300 underline">Bỏ chọn tất cả</button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {hand.map((cat, i) => {
            const isDiscarding = toDiscard.includes(i);
            const def = CARD_DEFS[cat as keyof typeof CARD_DEFS];
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggle(i)}
                className={[
                  'relative flex flex-col items-center gap-0.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-150 select-none',
                  isDiscarding
                    ? 'border-rose-500/60 bg-rose-500/20 ring-2 ring-rose-400/50 opacity-60 scale-95'
                    : `${def?.bgClass ?? ''} ${def?.borderClass ?? ''} hover:scale-105 active:scale-95`,
                ].join(' ')}
              >
                <span className="text-2xl">{def?.icon}</span>
                <span className={`text-[10px] leading-none ${isDiscarding ? 'text-rose-300' : (def?.textClass ?? '')}`}>
                  {def?.nameVI}
                </span>
                {isDiscarding && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">✕</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Keep / Discard preview */}
      <div className="grid grid-cols-2 gap-3">
        {/* Keep */}
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
          <p className="text-xs font-semibold text-green-400 mb-2">✅ Giữ lại ({keepIndices.length})</p>
          <div className="flex flex-wrap gap-1.5 min-h-[32px]">
            {keepIndices.map((i) => (
              <span key={i} className="text-xl" title={CARD_DEFS[hand[i] as keyof typeof CARD_DEFS]?.nameVI}>
                {CARD_DEFS[hand[i] as keyof typeof CARD_DEFS]?.icon}
              </span>
            ))}
            {keepIndices.length === 0 && <span className="text-slate-600 text-xs italic">Không giữ lá nào</span>}
          </div>
        </div>

        {/* Discard → Draw */}
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
          <p className="text-xs font-semibold text-rose-400 mb-2">🔄 Đổi lấy mới ({toDiscard.length})</p>
          <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center">
            {toDiscard.map((i) => (
              <span key={i} className="text-xl opacity-50 line-through" title={CARD_DEFS[hand[i] as keyof typeof CARD_DEFS]?.nameVI}>
                {CARD_DEFS[hand[i] as keyof typeof CARD_DEFS]?.icon}
              </span>
            ))}
            {toDiscard.length > 0 && (
              <>
                <span className="text-slate-500 text-sm">→</span>
                {Array.from({ length: toDiscard.length }).map((_, k) => (
                  <span key={k} className="text-xl animate-pulse">❓</span>
                ))}
              </>
            )}
            {toDiscard.length === 0 && <span className="text-slate-600 text-xs italic">Chưa chọn</span>}
          </div>
        </div>
      </div>

      <button
        onClick={handleConfirm}
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 py-3 font-semibold text-white transition-all hover:from-cyan-500 hover:to-cyan-600 disabled:opacity-40 shadow-lg shadow-cyan-500/20"
      >
        {loading
          ? 'Đang xử lý...'
          : toDiscard.length > 0
            ? `🔄 Đổi ${toDiscard.length} lá → Rút ${toDiscard.length} lá mới`
            : '✅ Giữ nguyên tay bài'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Load Bag Phase
// ─────────────────────────────────────────────────────────────────────────────
function LoadBagPhase({
  hand,
  onConfirm,
  isConfirmed,
}: {
  hand: string[];
  onConfirm: (indices: number[]) => Promise<void>;
  isConfirmed: boolean;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = (i: number) => {
    setSelected((prev) => {
      if (prev.includes(i)) return prev.filter((x) => x !== i);
      if (prev.length >= 5) return prev;
      return [...prev, i];
    });
  };

  const handleConfirm = async () => {
    if (selected.length < 1) return;
    setLoading(true);
    try { await onConfirm(selected); } finally { setLoading(false); }
  };

  if (isConfirmed) {
    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 text-center">
        <div className="text-4xl mb-2">👝</div>
        <p className="text-green-400 font-semibold">Túi hàng đã khóa</p>
        <p className="text-slate-500 text-sm mt-1">Chờ khai báo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">
          👝 Chọn 1–5 lá bỏ vào túi hàng
        </h3>
        <div className="flex flex-wrap gap-2">
          {hand.map((cat, i) => (
            <CardChip
              key={i}
              category={cat}
              selected={selected.includes(i)}
              onClick={() => toggle(i)}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-2xl">👝</span>
          <div className="flex gap-1.5">
            {selected.map((i) => (
              <span key={i} className="text-lg">{CARD_DEFS[hand[i] as keyof typeof CARD_DEFS]?.icon ?? '?'}</span>
            ))}
            {selected.length === 0 && <span className="text-slate-600 text-sm italic">Chưa chọn lá nào</span>}
          </div>
        </div>
      </div>
      <button
        onClick={handleConfirm}
        disabled={loading || selected.length < 1}
        className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 py-3 font-semibold text-white transition-all hover:from-amber-500 hover:to-amber-600 disabled:opacity-40 shadow-lg shadow-amber-500/20"
      >
        {loading ? 'Đang khóa túi...' : `🔒 Khóa túi (${selected.length} lá)`}
      </button>
      {selected.length < 1 && (
        <p className="text-center text-xs text-rose-400">Chọn ít nhất 1 lá để bỏ vào túi</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Declare Phase
// ─────────────────────────────────────────────────────────────────────────────
function DeclarePhase({
  bag,
  onDeclare,
  isDone,
}: {
  bag: string[];
  onDeclare: (good: LegalCategory) => Promise<void>;
  isDone: boolean;
}) {
  const [selected, setSelected] = useState<LegalCategory | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDeclare = async () => {
    if (!selected) return;
    setLoading(true);
    try { await onDeclare(selected); } finally { setLoading(false); }
  };

  if (isDone) {
    return (
      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 text-center">
        <div className="text-4xl mb-2">📣</div>
        <p className="text-blue-400 font-semibold">Đã khai báo với Sheriff</p>
        <p className="text-slate-500 text-sm mt-1">Chờ kiểm tra...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-sm text-amber-300 font-medium mb-1">📦 Túi của bạn có <strong>{bag.length}</strong> lá</p>
        <p className="text-xs text-slate-500">Khai với Sheriff bạn có <strong>{bag.length}</strong> lá gì (phải khai 1 loại hàng hợp pháp)</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">📣 Chọn loại hàng để khai báo</h3>
        <div className="grid grid-cols-2 gap-2">
          {LEGAL_GOODS.map((good) => {
            const def = CARD_DEFS[good];
            return (
              <button
                key={good}
                onClick={() => setSelected(good)}
                className={[
                  'flex items-center gap-3 rounded-xl border p-3 transition-all',
                  def.bgClass, def.borderClass,
                  selected === good ? `ring-2 ring-white/60 scale-[1.02] shadow-lg ${def.glowClass}` : 'hover:scale-[1.01]',
                ].join(' ')}
              >
                <span className="text-2xl">{def.icon}</span>
                <div className="text-left">
                  <p className={`font-semibold text-sm ${def.textClass}`}>{def.nameVI}</p>
                  <p className="text-xs text-slate-500">Giá trị: {def.value} 🪙/lá</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm text-cyan-300">
          Bạn sẽ khai: <strong>{bag.length} lá {CARD_DEFS[selected]?.nameVI}</strong>
        </div>
      )}

      <button
        onClick={handleDeclare}
        disabled={!selected || loading}
        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-3 font-semibold text-white transition-all hover:from-blue-500 hover:to-blue-600 disabled:opacity-40 shadow-lg shadow-blue-500/20"
      >
        {loading ? 'Đang khai báo...' : '📣 Xác nhận khai báo'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Inspect Phase — Merchant view
// ─────────────────────────────────────────────────────────────────────────────
function InspectMerchantView({
  playerId,
  gameState,
  onOfferBribe,
  onCancelBribe,
}: {
  playerId: string;
  gameState: SheriffGameState;
  onOfferBribe: (gold: number) => Promise<void>;
  onCancelBribe: () => Promise<void>;
}) {
  const [bribeAmount, setBribeAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const isCurrent = gameState.currentInspectTarget === playerId;
  const isRevealed = gameState.bagRevealed?.[playerId];
  const myDeclaration = gameState.declarations?.[playerId];
  const bribeOffer = gameState.bribeOffer;
  const myBribeOffer = bribeOffer?.fromPlayerId === playerId;

  const handleBribe = async () => {
    const amount = parseInt(bribeAmount);
    if (!amount || amount <= 0) return;
    setLoading(true);
    try { await onOfferBribe(amount); setBribeAmount(''); } finally { setLoading(false); }
  };

  const revealedContents = isRevealed ? (gameState.bagContents?.[playerId] ?? []) : null;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* My declaration */}
      {myDeclaration && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs text-slate-500 mb-1">Lời khai của bạn</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{CARD_DEFS[myDeclaration.good as keyof typeof CARD_DEFS]?.icon}</span>
            <span className="font-semibold text-white">{myDeclaration.count} lá {CARD_DEFS[myDeclaration.good as keyof typeof CARD_DEFS]?.nameVI}</span>
          </div>
        </div>
      )}

      {/* Status */}
      {!isCurrent && !isRevealed && (
        <div className="rounded-xl border border-white/5 bg-white/5 p-4 text-center text-slate-400 text-sm">
          ⏳ Chờ đến lượt bạn bị kiểm tra...
        </div>
      )}

      {/* Being inspected */}
      {isCurrent && !isRevealed && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-3">
          <p className="text-yellow-300 font-semibold text-sm mb-2">⚖️ Sheriff đang xem xét túi của bạn!</p>

          {/* Bribe controls */}
          {!myBribeOffer ? (
            <div className="flex gap-2 mt-2">
              <input
                type="number"
                min={1}
                value={bribeAmount}
                onChange={(e) => setBribeAmount(e.target.value)}
                placeholder="Số vàng hối lộ..."
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-500"
              />
              <button
                onClick={handleBribe}
                disabled={loading || !bribeAmount}
                className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-40 transition-colors"
              >
                🪙 Hối lộ
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 flex items-center justify-between">
              <span className="text-amber-300 text-sm">
                Đề nghị: <strong>{bribeOffer?.gold} 🪙</strong>
                {bribeOffer?.status === 'accepted' && ' ✅ Chấp nhận!'}
                {bribeOffer?.status === 'rejected' && ' ❌ Từ chối'}
                {bribeOffer?.status === 'pending' && ' — Chờ Sheriff...'}
              </span>
              {bribeOffer?.status === 'pending' && (
                <button onClick={() => { setLoading(true); onCancelBribe().finally(() => setLoading(false)); }} className="text-xs text-slate-400 hover:text-slate-200">✕ Hủy</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Revealed result */}
      {isRevealed && revealedContents && (
        <BagRevealCard
          contents={revealedContents}
          declaration={myDeclaration}
          wasInspected={!!gameState.inspectDecisions?.[playerId]}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Bag Reveal Card
// ─────────────────────────────────────────────────────────────────────────────
function BagRevealCard({
  contents,
  declaration,
  wasInspected,
}: {
  contents: string[];
  declaration?: { good: string; count: number };
  wasInspected: boolean;
}) {
  const isHonest = declaration
    ? contents.every((c) => c === declaration.good)
    : false;

  return (
    <div className={[
      'rounded-xl border p-3 animate-scale-in',
      isHonest
        ? 'border-green-500/30 bg-green-500/5'
        : wasInspected ? 'border-rose-500/30 bg-rose-500/5' : 'border-white/10 bg-white/5',
    ].join(' ')}>
      <div className="flex items-center gap-2 mb-2">
        {!wasInspected && <span className="text-slate-400 text-xs">✓ Cho qua</span>}
        {wasInspected && isHonest && <span className="text-green-400 text-xs font-semibold">✅ Nói thật</span>}
        {wasInspected && !isHonest && <span className="text-rose-400 text-xs font-semibold">❌ Nói dối</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {contents.map((cat, i) => (
          <CardChip key={i} category={cat} size="sm" />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Inspect Phase — Sheriff view
// ─────────────────────────────────────────────────────────────────────────────
function InspectSheriffView({
  gameState,
  players,
  onDecide,
  onRespondBribe,
}: {
  gameState: SheriffGameState;
  players: { id: string; name: string }[];
  onDecide: (decision: 'pass' | 'inspect') => Promise<void>;
  onRespondBribe: (accept: boolean) => Promise<void>;
}) {
  const [loading, setLoading] = useState<'pass' | 'inspect' | null>(null);
  const [brLoading, setBrLoading] = useState<'accept' | 'reject' | null>(null);
  const { currentInspectTarget, declarations, bagSizes, bribeOffer } = gameState;

  const currentPlayer = players.find((p) => p.id === currentInspectTarget);
  const declaration = currentInspectTarget ? declarations?.[currentInspectTarget] : null;
  const bagSize = currentInspectTarget ? bagSizes?.[currentInspectTarget] : null;

  const handleDecide = async (d: 'pass' | 'inspect') => {
    setLoading(d);
    try { await onDecide(d); } finally { setLoading(null); }
  };

  const handleBribe = async (accept: boolean) => {
    setBrLoading(accept ? 'accept' : 'reject');
    try { await onRespondBribe(accept); } finally { setBrLoading(null); }
  };

  if (!currentInspectTarget) {
    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 text-center">
        <div className="text-4xl mb-2">🎉</div>
        <p className="text-green-400 font-semibold">Đã kiểm tra tất cả thương nhân!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Inspection queue overview */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs text-slate-500 mb-2">Hàng chờ kiểm tra</p>
        <div className="flex gap-2 flex-wrap">
          {gameState.inspectQueue?.map((id) => {
            const p = players.find((x) => x.id === id);
            const revealed = gameState.bagRevealed?.[id];
            const isCurrent = id === currentInspectTarget;
            return (
              <span key={id} className={[
                'px-2 py-0.5 rounded-full text-xs font-medium border',
                revealed ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                isCurrent ? 'border-yellow-400/50 text-yellow-300 bg-yellow-400/10 animate-pulse' :
                'border-white/10 text-slate-500 bg-white/5',
              ].join(' ')}>
                {revealed ? '✓ ' : isCurrent ? '⚖️ ' : ''}{p?.name ?? id}
              </span>
            );
          })}
        </div>
      </div>

      {/* Current target */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <p className="text-xs text-amber-400/70 mb-2 font-medium uppercase tracking-wider">Đang kiểm tra</p>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
            {currentPlayer?.name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-white text-lg">{currentPlayer?.name}</p>
            {bagSize !== null && bagSize !== undefined && (
              <p className="text-xs text-slate-400">Túi: <strong className="text-white">{bagSize} lá</strong></p>
            )}
          </div>
        </div>

        {/* Declaration */}
        {declaration && (
          <div className="rounded-xl border border-white/10 bg-white/10 p-3 mb-4">
            <p className="text-xs text-slate-400 mb-1">Lời khai:</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{CARD_DEFS[declaration.good as keyof typeof CARD_DEFS]?.icon}</span>
              <span className="text-white font-bold text-base">
                {declaration.count} lá {CARD_DEFS[declaration.good as keyof typeof CARD_DEFS]?.nameVI}
              </span>
            </div>
          </div>
        )}

        {/* Bribe offer */}
        {bribeOffer && bribeOffer.status === 'pending' && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 mb-4">
            <p className="text-amber-300 text-sm font-semibold mb-2">
              💰 {players.find(p => p.id === bribeOffer.fromPlayerId)?.name} đề nghị hối lộ <strong>{bribeOffer.gold} 🪙</strong>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleBribe(true)}
                disabled={brLoading !== null}
                className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-40 transition-colors"
              >
                {brLoading === 'accept' ? '...' : '✅ Chấp nhận'}
              </button>
              <button
                onClick={() => handleBribe(false)}
                disabled={brLoading !== null}
                className="flex-1 rounded-lg bg-rose-700 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-40 transition-colors"
              >
                {brLoading === 'reject' ? '...' : '❌ Từ chối'}
              </button>
            </div>
          </div>
        )}

        {/* Decision buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleDecide('pass')}
            disabled={loading !== null}
            className="rounded-xl border border-green-500/30 bg-green-600/20 py-4 font-bold text-green-300 hover:bg-green-600/30 disabled:opacity-40 transition-all active:scale-95"
          >
            {loading === 'pass' ? '⏳' : '✅'}<br />
            <span className="text-sm">Cho qua</span>
          </button>
          <button
            onClick={() => handleDecide('inspect')}
            disabled={loading !== null}
            className="rounded-xl border border-rose-500/30 bg-rose-600/20 py-4 font-bold text-rose-300 hover:bg-rose-600/30 disabled:opacity-40 transition-all active:scale-95"
          >
            {loading === 'inspect' ? '⏳' : '🔍'}<br />
            <span className="text-sm">Kiểm tra</span>
          </button>
        </div>
      </div>

      {/* All revealed results */}
      {Object.keys(gameState.bagRevealed ?? {}).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Kết quả đã xử lý</p>
          {Object.entries(gameState.bagRevealed ?? {})
            .filter(([, v]) => v)
            .map(([id]) => {
              const p = players.find((x) => x.id === id);
              const contents = gameState.bagContents?.[id] ?? [];
              const decl = gameState.declarations?.[id];
              const wasInspected = gameState.inspectDecisions?.[id] === 'inspect';
              return (
                <div key={id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-slate-400 mb-1">{p?.name}</p>
                  <BagRevealCard contents={contents} declaration={decl} wasInspected={wasInspected} />
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Market Display
// ─────────────────────────────────────────────────────────────────────────────
function MarketDisplay({ players, myId }: { players: import('@/types/player').Player[]; myId: string }) {
  return (
    <div className="space-y-2">
      {players.map((p) => {
        const data = readPlayerData(p);
        const allCards = [...data.marketLegal, ...data.marketContraband];
        if (allCards.length === 0) return null;
        return (
          <div key={p.id} className={`rounded-xl border p-3 ${p.id === myId ? 'border-cyan-500/20 bg-cyan-500/5' : 'border-white/10 bg-white/5'}`}>
            <p className="text-xs text-slate-400 mb-2">
              {p.name}{p.id === myId ? ' (bạn)' : ''} · <GoldBadge amount={data.gold} className="text-xs" />
            </p>
            <div className="flex flex-wrap gap-1">
              {allCards.map((cat, i) => <CardChip key={i} category={cat} size="sm" />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: End Round Panel
// ─────────────────────────────────────────────────────────────────────────────
function EndRoundPanel({
  gameState,
  players,
  myId,
  isHost,
  onProceed,
}: {
  gameState: SheriffGameState;
  players: import('@/types/player').Player[];
  myId: string;
  isHost: boolean;
  onProceed: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const isLastRound = gameState.round >= gameState.totalRounds;
  const roundEntries = (gameState.roundLog ?? []).filter((e) => e.round === gameState.round);

  // Compute current standings from live player data
  const standings = players
    .map((p) => {
      const data = readPlayerData(p);
      const allCards = [...data.marketLegal, ...data.marketContraband];
      let marketValue = 0;
      for (const cat of allCards) {
        const def = CARD_DEFS[cat as keyof typeof CARD_DEFS];
        if (def) marketValue += def.value;
      }
      return {
        id: p.id,
        name: p.name,
        gold: data.gold,
        marketValue,
        marketCards: allCards.length,
        total: data.gold + marketValue,
        isSheriff: p.id === gameState.sheriffPlayerId,
      };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Round summary */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="font-bold text-white mb-3">📜 Tóm tắt vòng {gameState.round}</h3>
        {roundEntries.length === 0 ? (
          <p className="text-slate-500 text-sm italic">Không có dữ liệu vòng này.</p>
        ) : (
          <div className="space-y-2">
            {roundEntries.map((entry, i) => (
              <div key={i} className={`rounded-xl border p-3 ${entry.wasHonest ? 'border-green-500/20 bg-green-500/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm text-white">{entry.merchantName}</span>
                  <span className={`text-xs font-medium ${!entry.wasInspected ? 'text-slate-400' : entry.wasHonest ? 'text-green-400' : 'text-rose-400'}`}>
                    {entry.wasInspected
                      ? (entry.wasHonest ? '✅ Nói thật (bị kiểm)' : '❌ Nói dối (bị bắt)')
                      : '✓ Được cho qua'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-1">Khai: <span className="text-slate-300">{entry.declared}</span></p>
                <div className="flex flex-wrap gap-1">
                  {entry.bagContents.map((cat, j) => <CardChip key={j} category={cat} size="sm" />)}
                </div>
                {entry.goldChange !== 0 && (
                  <p className={`text-xs mt-1.5 font-semibold ${entry.goldChange > 0 ? 'text-green-400' : 'text-rose-400'}`}>
                    {entry.goldChange > 0 ? `+${entry.goldChange}` : entry.goldChange} 🪙
                    {entry.bribeGold ? ` (hối lộ: ${entry.bribeGold} 🪙)` : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current standings */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <h3 className="font-bold text-amber-300 mb-3">📊 Bảng điểm hiện tại</h3>
        <div className="space-y-2">
          {standings.map((s, rank) => (
            <div
              key={s.id}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all ${
                s.id === myId
                  ? 'border-cyan-500/30 bg-cyan-500/5'
                  : 'border-white/5 bg-white/5'
              }`}
            >
              {/* Rank */}
              <span className={`text-base font-black w-5 text-center ${rank === 0 ? 'text-amber-400' : rank === 1 ? 'text-slate-300' : rank === 2 ? 'text-amber-700' : 'text-slate-600'}`}>
                {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}
              </span>

              {/* Name */}
              <span className={`flex-1 font-semibold text-sm ${s.id === myId ? 'text-cyan-300' : 'text-white'}`}>
                {s.name}
                {s.id === myId && <span className="text-cyan-500 text-xs ml-1">(bạn)</span>}
                {s.isSheriff && <span className="text-amber-400 text-xs ml-1">⚖️</span>}
              </span>

              {/* Score breakdown */}
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span title="Vàng">🪙 {s.gold}</span>
                <span className="text-white/10">|</span>
                <span title="Giá trị hàng hóa">📦 {s.marketValue}</span>
              </div>

              {/* Total */}
              <span className={`font-black text-base ml-1 ${rank === 0 ? 'text-amber-300' : 'text-white'}`}>
                {s.total}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-600 mt-2">* Chưa tính thưởng King/Queen — sẽ tính ở vòng cuối</p>
      </div>

      {/* Proceed button */}
      {isHost ? (
        <button
          onClick={async () => { setLoading(true); try { await onProceed(); } finally { setLoading(false); } }}
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 font-semibold text-white transition-all hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 shadow-lg"
        >
          {loading ? 'Đang xử lý...' : isLastRound ? '🏆 Tính điểm cuối game' : `▶ Bắt đầu vòng ${gameState.round + 1}`}
        </button>
      ) : (
        <p className="text-center text-slate-500 text-sm py-2">⏳ Chờ host chuyển vòng...</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Final Scoring
// ─────────────────────────────────────────────────────────────────────────────
function FinalScoringPanel({
  gameState,
  players,
  myId,
  onReset,
  isHost,
}: {
  gameState: SheriffGameState;
  players: { id: string; name: string }[];
  myId: string;
  onReset: () => Promise<void>;
  isHost: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const scores = gameState.finalScores ?? [];
  const winner = scores[0];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Winner announcement */}
      {winner && (
        <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 p-6 text-center">
          <div className="text-5xl mb-2">🏆</div>
          <p className="text-2xl font-black text-amber-300">{winner.playerName}</p>
          <p className="text-slate-400 text-sm mt-1">Người thắng cuộc với {winner.total} điểm!</p>
          {winner.playerId === myId && (
            <p className="mt-2 text-amber-400 font-bold animate-pulse">🎉 Bạn đã thắng!</p>
          )}
        </div>
      )}

      {/* Scoreboard */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2">
          <span className="text-sm font-bold text-white">Bảng điểm</span>
        </div>
        <div className="divide-y divide-white/5">
          {scores.map((s, rank) => (
            <div key={s.playerId} className={`p-3 ${s.playerId === myId ? 'bg-cyan-500/5' : ''}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-black ${rank === 0 ? 'text-amber-400' : rank === 1 ? 'text-slate-300' : rank === 2 ? 'text-amber-700' : 'text-slate-600'}`}>
                    #{rank + 1}
                  </span>
                  <span className={`font-semibold ${s.playerId === myId ? 'text-cyan-300' : 'text-white'}`}>{s.playerName}</span>
                  {s.playerId === myId && <span className="text-xs text-cyan-500">(bạn)</span>}
                </div>
                <span className="text-xl font-black text-amber-300">{s.total}</span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-xs text-slate-500">
                <span>🪙 {s.gold}</span>
                <span>📦 {s.legalValue + s.royalValue}</span>
                <span>🔴 {s.contrabandValue}</span>
                {s.kingBonus > 0 && <span className="text-amber-400">👑 +{s.kingBonus}</span>}
                {s.queenBonus > 0 && <span className="text-slate-300">🥈 +{s.queenBonus}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isHost && (
        <button
          onClick={async () => { setLoading(true); try { await onReset(); } finally { setLoading(false); } }}
          disabled={loading}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-3 font-semibold text-slate-300 hover:bg-white/10 transition-all"
        >
          {loading ? '...' : '🔄 Chơi lại'}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Guide / How to Play
// ─────────────────────────────────────────────────────────────────────────────
function SheriffGuide({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'overview' | 'cards' | 'phases' | 'scoring'>('overview');

  const tabs = [
    { id: 'overview', label: '📖 Tổng quan' },
    { id: 'cards',    label: '🃏 Hàng hóa' },
    { id: 'phases',   label: '🎮 Luật chơi' },
    { id: 'scoring',  label: '🏆 Tính điểm' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-3xl">⚖️</span>
          <div>
            <h2 className="font-black text-white text-lg leading-tight">Sheriff of Nottingham</h2>
            <p className="text-xs text-slate-500">Hướng dẫn chơi</p>
          </div>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">✕</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 border-b border-white/10 flex-shrink-0 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.id ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {tab === 'overview' && (
          <>
            <InfoBlock title="🎯 Mục tiêu" color="amber">
              Trở thành người giàu nhất sau khi tính tiền, giá trị hàng hóa và thưởng King/Queen.
            </InfoBlock>
            <InfoBlock title="👥 Số người" color="blue">
              3–6 người chơi. Mỗi vòng chơi, 1 người làm <strong>Sheriff</strong> và những người còn lại là <strong>Thương nhân (Merchant)</strong>.
            </InfoBlock>
            <InfoBlock title="🔄 Cấu trúc vòng chơi" color="purple">
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>🛒 <strong>Market</strong> — đổi bài để chuẩn bị</li>
                <li>👝 <strong>Load Bag</strong> — chọn 1–5 lá bỏ vào túi</li>
                <li>📣 <strong>Declare</strong> — khai báo với Sheriff (có thể nói dối)</li>
                <li>🔍 <strong>Inspect</strong> — Sheriff kiểm tra từng người</li>
              </ol>
            </InfoBlock>
            <InfoBlock title="🪙 Vốn ban đầu" color="green">
              Mỗi người bắt đầu với <strong>50 vàng</strong>. Sheriff không buôn bán trong vòng làm Sheriff.
            </InfoBlock>
          </>
        )}

        {tab === 'cards' && (
          <>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Hàng hợp pháp — được phép khai báo</p>
            {(['apple', 'cheese', 'bread', 'chicken'] as const).map((cat) => {
              const def = CARD_DEFS[cat];
              return (
                <div key={cat} className={`rounded-xl border p-3 flex items-center gap-3 ${def.bgClass} ${def.borderClass}`}>
                  <span className="text-3xl">{def.icon}</span>
                  <div className="flex-1">
                    <p className={`font-bold ${def.textClass}`}>{def.nameVI}</p>
                    <p className="text-xs text-slate-500">{def.count} lá · Giá trị: {def.value} 🪙 · Phạt: {def.penalty} 🪙</p>
                  </div>
                </div>
              );
            })}

            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-2">Hàng lậu — không được khai báo</p>
            {(['pepper', 'mead', 'silk', 'crossbow'] as const).map((cat) => {
              const def = CARD_DEFS[cat];
              return (
                <div key={cat} className={`rounded-xl border p-3 flex items-center gap-3 ${def.bgClass} ${def.borderClass}`}>
                  <span className="text-3xl">{def.icon}</span>
                  <div className="flex-1">
                    <p className={`font-bold ${def.textClass}`}>{def.nameVI}</p>
                    <p className="text-xs text-slate-500">{def.count} lá · Giá trị: {def.value} 🪙 · Phạt: {def.penalty} 🪙</p>
                  </div>
                </div>
              );
            })}

            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-2">Royal Goods — hàng lậu đặc biệt</p>
            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm text-yellow-300">
              Royal Goods bị coi là hàng lậu khi bị kiểm tra, nhưng tính vào loại hàng hợp pháp tương ứng để xét thưởng King/Queen cuối game.
            </div>
          </>
        )}

        {tab === 'phases' && (
          <>
            <InfoBlock title="🛒 Market — Đổi bài" color="cyan">
              Chọn 0–5 lá trong tay để đổi lấy lá mới từ chồng bài. Sau đó tay bài trở lại 6 lá.
            </InfoBlock>
            <InfoBlock title="👝 Load Bag — Đóng túi" color="amber">
              Chọn <strong>1–5 lá</strong> từ tay bỏ vào túi. Sau khi xác nhận, không thay đổi được. Số lượng lá trong túi sẽ hiện công khai.
            </InfoBlock>
            <InfoBlock title="📣 Declare — Khai báo" color="blue">
              Khai với Sheriff <strong>1 loại hàng hợp pháp</strong> và số lượng <strong>đúng bằng số lá trong túi</strong>. Bạn có thể nói thật hoặc nói dối về loại hàng!
            </InfoBlock>
            <InfoBlock title="🔍 Inspect — Kiểm tra" color="purple">
              <div className="space-y-2 text-sm">
                <p>Sheriff xử lý từng Merchant:</p>
                <p>✅ <strong>Cho qua</strong>: Toàn bộ hàng vào chợ, không hỏi han.</p>
                <p>🔍 <strong>Kiểm tra</strong> nếu Merchant <em>nói thật</em>: Hàng vào chợ, <strong>Sheriff đền tiền</strong> = tổng phạt các lá trong túi.</p>
                <p>🔍 <strong>Kiểm tra</strong> nếu Merchant <em>nói dối</em>: Hàng đúng vẫn vào chợ, hàng sai bị tịch thu, <strong>Merchant trả phạt</strong> = tổng phạt hàng sai.</p>
              </div>
            </InfoBlock>
            <InfoBlock title="💰 Hối lộ" color="green">
              Merchant có thể đề nghị trả vàng cho Sheriff để được cho qua. Sheriff có thể chấp nhận hoặc từ chối.
            </InfoBlock>
          </>
        )}

        {tab === 'scoring' && (
          <>
            <InfoBlock title="📊 Tổng điểm" color="amber">
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Vàng còn lại</li>
                <li>Giá trị hàng hợp pháp trong chợ</li>
                <li>Giá trị hàng lậu đã đưa qua</li>
                <li>Giá trị Royal Goods</li>
                <li>Thưởng King / Queen</li>
              </ul>
            </InfoBlock>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Thưởng King &amp; Queen</p>
            {LEGAL_GOODS.map((cat) => {
              const def = CARD_DEFS[cat];
              const bonus = { apple: { king: 20, queen: 10 }, cheese: { king: 15, queen: 10 }, bread: { king: 15, queen: 10 }, chicken: { king: 10, queen: 5 } }[cat];
              return (
                <div key={cat} className={`rounded-xl border p-3 flex items-center gap-3 ${def.bgClass} ${def.borderClass}`}>
                  <span className="text-2xl">{def.icon}</span>
                  <div>
                    <p className={`font-semibold ${def.textClass}`}>{def.nameVI}</p>
                    <p className="text-xs text-slate-500">👑 Nhiều nhất: +{bonus.king} · 🥈 Nhì: +{bonus.queen}</p>
                  </div>
                </div>
              );
            })}
            <InfoBlock title="🤝 Hòa điểm" color="slate">
              Ưu tiên: nhiều hàng hợp pháp hơn → nhiều hàng lậu hơn → chia thắng.
            </InfoBlock>
          </>
        )}
      </div>
    </div>
  );
}

function InfoBlock({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    amber:  'border-amber-500/20 bg-amber-500/5 text-amber-200',
    blue:   'border-blue-500/20 bg-blue-500/5 text-blue-200',
    purple: 'border-purple-500/20 bg-purple-500/5 text-purple-200',
    cyan:   'border-cyan-500/20 bg-cyan-500/5 text-cyan-200',
    green:  'border-green-500/20 bg-green-500/5 text-green-200',
    slate:  'border-white/10 bg-white/5 text-slate-300',
  };
  return (
    <div className={`rounded-xl border p-3 ${colorMap[color] ?? colorMap.slate}`}>
      <p className="font-bold text-sm mb-1">{title}</p>
      <div className="text-sm opacity-80">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Lobby
// ─────────────────────────────────────────────────────────────────────────────
function SheriffLobby({
  room,
  players,
  playerId,
  isHost,
  onStart,
  onShowGuide,
}: {
  room: import('@/types/room').Room | null;
  players: import('@/types/player').Player[];
  playerId: string;
  isHost: boolean;
  onStart: (totalRounds: number) => Promise<void>;
  onShowGuide: () => void;
}) {
  const [rounds, setRounds] = useState(2);
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const canStart = players.length >= 3 && isHost;

  const handleStart = async () => {
    setLoading(true);
    try { await onStart(rounds); } finally { setLoading(false); }
  };

  const handleCopyLink = () => {
    if (!room) return;
    const url = `${window.location.origin}/room/sheriff/${room.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in max-w-lg mx-auto">
      {/* Title */}
      <div className="text-center py-4">
        <div className="text-6xl mb-3 animate-float">⚖️</div>
        <h1 className="text-3xl font-black text-white mb-1">Sheriff of Nottingham</h1>
        <p className="text-slate-400 text-sm">Buôn bán, nói dối, thương lượng &amp; hối lộ</p>
      </div>

      {/* Invite section */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-semibold text-amber-400/70 uppercase tracking-wider mb-3">
          📨 Mời bạn bè tham gia
        </p>

        {/* Room code */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Mã phòng</p>
              <p className="font-mono text-2xl font-black tracking-[0.25em] text-white">{room?.roomCode ?? '...'}</p>
            </div>
            <button
              onClick={() => room?.roomCode && navigator.clipboard.writeText(room.roomCode)}
              className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              title="Copy mã phòng"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-all"
          >
            {copied ? (
              <><span className="text-green-400">✓</span> Đã copy!</>
            ) : (
              <><span>🔗</span> Copy link</>
            )}
          </button>
          <button
            onClick={() => setShowQR((v) => !v)}
            className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all ${showQR ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}
          >
            <span>📱</span> QR Code
          </button>
        </div>

        {/* QR Code panel */}
        {showQR && (
          <div className="mt-3 flex justify-center animate-scale-in">
            {room && <QRCodeDisplay roomId={room.id} roomCode={room.roomCode} gameType="sheriff" />}
          </div>
        )}
      </div>

      {/* Player list */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-400">👥 Người chơi ({players.length}/6)</p>
          <span className={`text-xs px-2 py-0.5 rounded-full ${players.length >= 3 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
            {players.length >= 3 ? 'Đủ người' : `Cần thêm ${3 - players.length} người`}
          </span>
        </div>
        <div className="space-y-2">
          {players.map((p) => (
            <div key={p.id} className={`flex items-center gap-3 rounded-xl p-3 border ${p.id === playerId ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-white/5 bg-white/5'}`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {p.name[0].toUpperCase()}
              </div>
              <span className={`font-medium ${p.id === playerId ? 'text-cyan-300' : 'text-white'}`}>
                {p.name}{p.id === playerId ? ' (bạn)' : ''}
              </span>
              {p.isHost && <span className="ml-auto text-xs text-amber-400 border border-amber-400/20 rounded-full px-2 py-0.5">Host</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      {isHost && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-slate-400 mb-3">⚙️ Cài đặt</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Số vòng mỗi người làm Sheriff</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setRounds(r => Math.max(1, r - 1))} className="w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 font-bold transition-colors">−</button>
              <span className="text-white font-bold w-6 text-center">{rounds}</span>
              <button onClick={() => setRounds(r => Math.min(4, r + 1))} className="w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 font-bold transition-colors">+</button>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Tổng {players.length * rounds} vòng ({players.length} người × {rounds} lần)
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={onShowGuide}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-3 font-medium text-slate-300 hover:bg-white/10 transition-all"
        >
          📖 Xem hướng dẫn chơi
        </button>

        {isHost ? (
          <button
            onClick={handleStart}
            disabled={!canStart || loading}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 font-bold text-white transition-all hover:from-amber-400 hover:to-orange-500 disabled:opacity-40 shadow-lg shadow-amber-500/20 text-lg"
          >
            {loading ? '⏳ Đang bắt đầu...' : players.length < 3 ? '⏳ Chờ đủ người...' : '🎮 Bắt đầu game'}
          </button>
        ) : (
          <div className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-center text-slate-400 text-sm">
            ⏳ Chờ host bắt đầu...
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Board Component
// ─────────────────────────────────────────────────────────────────────────────
export default function SheriffBoard({ room, players, playerId, isHost }: GameModuleProps) {
  const [showGuide, setShowGuide] = useState(false);

  const {
    gameState,
    myData,
    isSheriff,
    merchants,
    startGame,
    confirmMarket,
    confirmBag,
    submitDeclaration,
    offerBribe,
    cancelBribe,
    respondToBribe,
    decideSheriff,
    proceedAfterRound,
    resetGame,
    advanceMarketPhase,
    advanceBagPhase,
    advanceDeclarePhase,
  } = useSheriff(room, players, playerId, isHost);

  // Host auto-advance: market → load_bag
  useEffect(() => {
    if (!isHost || !gameState || gameState.phase !== 'market') return;
    const allReady = merchants.every((p) => gameState.marketReady?.[p.id]);
    if (allReady && merchants.length > 0) {
      advanceMarketPhase();
    }
  }, [isHost, gameState, merchants, advanceMarketPhase]);

  // Host auto-advance: load_bag → declare
  useEffect(() => {
    if (!isHost || !gameState || gameState.phase !== 'load_bag') return;
    const allConfirmed = merchants.every((p) => gameState.bagConfirmed?.[p.id]);
    if (allConfirmed && merchants.length > 0) {
      advanceBagPhase();
    }
  }, [isHost, gameState, merchants, advanceBagPhase]);

  // Host auto-advance: declare → inspect
  useEffect(() => {
    if (!isHost || !gameState || gameState.phase !== 'declare') return;
    const allDeclared = merchants.every((p) => gameState.declarationDone?.[p.id]);
    if (allDeclared && merchants.length > 0) {
      advanceDeclarePhase();
    }
  }, [isHost, gameState, merchants, advanceDeclarePhase]);

  const sheriffPlayer = players.find((p) => p.id === gameState?.sheriffPlayerId);

  // ── Lobby ──
  if (!gameState || gameState.phase === undefined) {
    return (
      <div className="min-h-screen px-4 py-6">
        {showGuide && <SheriffGuide onClose={() => setShowGuide(false)} />}
        <SheriffLobby
          room={room}
          players={players}
          playerId={playerId}
          isHost={isHost}
          onStart={startGame}
          onShowGuide={() => setShowGuide(true)}
        />
      </div>
    );
  }

  // ── In-Game ──
  const phase = gameState.phase;
  const myMarketDone = gameState.marketReady?.[playerId];
  const myBagDone = gameState.bagConfirmed?.[playerId];
  const myDeclDone = gameState.declarationDone?.[playerId];

  return (
    <div className="min-h-screen pb-safe">
      {showGuide && <SheriffGuide onClose={() => setShowGuide(false)} />}

      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-sm border-b border-white/5 px-4 pt-safe pt-2 pb-2">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚖️</span>
            <div>
              <p className="text-xs text-slate-500 leading-none">Sheriff of Nottingham</p>
              <p className="text-sm font-bold text-white leading-none mt-0.5">
                {PHASE_LABELS[phase] ?? phase}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GoldBadge amount={myData.gold} />
            <button
              onClick={() => setShowGuide(true)}
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white text-sm transition-colors"
            >
              ?
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Phase + Sheriff banner */}
        <PhaseBanner
          phase={phase}
          round={gameState.round}
          totalRounds={gameState.totalRounds}
          sheriffName={sheriffPlayer?.name ?? '?'}
        />

        {/* Player status */}
        <PlayerStatusList players={players} gameState={gameState} myId={playerId} />

        {/* === MARKET PHASE === */}
        {phase === 'market' && !isSheriff && (
          <MarketPhase
            hand={myData.hand}
            onConfirm={confirmMarket}
            isReady={!!myMarketDone}
          />
        )}
        {phase === 'market' && isSheriff && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
            <div className="text-4xl mb-2">⚖️</div>
            <p className="text-amber-300 font-semibold">Bạn là Sheriff vòng này</p>
            <p className="text-slate-500 text-sm mt-1">Chờ các thương nhân đổi bài...</p>
          </div>
        )}

        {/* === LOAD BAG PHASE === */}
        {phase === 'load_bag' && !isSheriff && (
          <LoadBagPhase
            hand={myData.hand}
            onConfirm={confirmBag}
            isConfirmed={!!myBagDone}
          />
        )}
        {phase === 'load_bag' && isSheriff && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
            <div className="text-4xl mb-2">⚖️</div>
            <p className="text-amber-300 font-semibold">Các thương nhân đang đóng túi...</p>
            <div className="mt-3 flex justify-center gap-2">
              {merchants.map((p) => (
                <div key={p.id} className="flex flex-col items-center gap-1">
                  <span className="text-xl">{gameState.bagConfirmed?.[p.id] ? '👝' : '⏳'}</span>
                  <span className="text-xs text-slate-500">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === DECLARE PHASE === */}
        {phase === 'declare' && !isSheriff && (
          <DeclarePhase
            bag={myData.bag}
            onDeclare={submitDeclaration}
            isDone={!!myDeclDone}
          />
        )}
        {phase === 'declare' && isSheriff && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
            <div className="text-4xl mb-2">📣</div>
            <p className="text-amber-300 font-semibold">Đang nhận lời khai từ thương nhân...</p>
            <div className="mt-3 flex flex-col gap-2">
              {merchants.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                  <span>{gameState.declarationDone?.[p.id] ? '✅' : '⏳'}</span>
                  <span className="text-sm text-slate-300">{p.name}</span>
                  {gameState.declarations?.[p.id] && (
                    <span className="ml-auto text-xs text-slate-400">
                      {gameState.declarations[p.id].count} lá {CARD_DEFS[gameState.declarations[p.id].good as keyof typeof CARD_DEFS]?.nameVI}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === INSPECT PHASE === */}
        {phase === 'inspect' && isSheriff && (
          <InspectSheriffView
            gameState={gameState}
            players={players}
            onDecide={decideSheriff}
            onRespondBribe={respondToBribe}
          />
        )}
        {phase === 'inspect' && !isSheriff && (
          <>
            {/* Show all declarations */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">Lời khai của tất cả</p>
              <div className="space-y-1">
                {merchants.map((p) => {
                  const decl = gameState.declarations?.[p.id];
                  return (
                    <div key={p.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${p.id === playerId ? 'bg-cyan-500/10' : 'bg-white/5'}`}>
                      <span className={`text-sm font-medium ${p.id === playerId ? 'text-cyan-300' : 'text-slate-300'}`}>{p.name}</span>
                      {decl && (
                        <span className="ml-auto text-xs text-slate-400 flex items-center gap-1">
                          {gameState.bagSizes?.[p.id] ?? '?'} lá
                          <span className="text-white font-medium">{CARD_DEFS[decl.good as keyof typeof CARD_DEFS]?.nameVI}</span>
                          <span>{CARD_DEFS[decl.good as keyof typeof CARD_DEFS]?.icon}</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <InspectMerchantView
              playerId={playerId}
              gameState={gameState}
              onOfferBribe={offerBribe}
              onCancelBribe={cancelBribe}
            />
          </>
        )}

        {/* === END ROUND === */}
        {phase === 'end_round' && (
          <EndRoundPanel
            gameState={gameState}
            players={players}
            myId={playerId}
            isHost={isHost}
            onProceed={proceedAfterRound}
          />
        )}

        {/* === FINAL SCORING === */}
        {phase === 'final_scoring' && (
          <FinalScoringPanel
            gameState={gameState}
            players={players}
            myId={playerId}
            onReset={resetGame}
            isHost={isHost}
          />
        )}

        {/* Market overview (visible during and after inspect) */}
        {(phase === 'inspect' || phase === 'end_round') && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-slate-400 mb-3">🏪 Chợ hiện tại</p>
            <MarketDisplay players={players} myId={playerId} />
          </div>
        )}
      </div>
    </div>
  );
}
