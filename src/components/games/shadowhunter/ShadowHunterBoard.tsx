'use client';

import { useState, useEffect } from 'react';
import type { GameModuleProps } from '@/lib/gameRegistry';
import type { Room } from '@/types/room';
import QRCodeDisplay from '@/components/core/QRCodeDisplay';
import { useShadowHunter } from './useShadowHunter';
import { getCardDef, getCharacterDef, AREAS, AREA_GROUP, PLAYER_DISTRIBUTION } from './constants';
import type { SHArea, SHPublicPlayerState, SHGameState, SHFaction } from './types';

// ─── Colour helpers ───────────────────────────────────────────────────────────
function factionColor(f?: SHFaction) {
  if (f === 'HUNTER') return 'text-blue-400';
  if (f === 'SHADOW') return 'text-red-400';
  return 'text-gray-400';
}
function factionBorder(f?: SHFaction) {
  if (f === 'HUNTER') return 'border-blue-500/60';
  if (f === 'SHADOW') return 'border-red-500/60';
  return 'border-gray-500/60';
}
function factionBg(f?: SHFaction) {
  if (f === 'HUNTER') return 'bg-blue-900/30';
  if (f === 'SHADOW') return 'bg-red-900/30';
  return 'bg-gray-800/30';
}

function hpColor(damage: number, maxHp: number) {
  const pct = maxHp > 0 ? damage / maxHp : 0;
  if (pct < 0.5) return 'bg-green-500';
  if (pct < 0.8) return 'bg-yellow-500';
  return 'bg-red-500';
}

function areaColor(area: SHArea) {
  const grp = AREA_GROUP[area];
  if (grp === 1) return 'from-indigo-900/60 to-indigo-800/40 border-indigo-500/40';
  if (grp === 2) return 'from-violet-900/60 to-violet-800/40 border-violet-500/40';
  return 'from-emerald-900/60 to-emerald-800/40 border-emerald-500/40';
}

// ─── Small reusable pieces ────────────────────────────────────────────────────
function Badge({ children, cls = '' }: { children: React.ReactNode; cls?: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{children}</span>;
}

function Btn({
  children, onClick, disabled = false, danger = false, className = '',
}: {
  children: React.ReactNode; onClick?: () => void;
  disabled?: boolean; danger?: boolean; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer
        ${danger
          ? 'bg-red-700 hover:bg-red-600 text-white border border-red-500/60'
          : 'bg-gray-700 hover:bg-gray-600 text-gray-100 border border-gray-500/60'}
        ${className}`}
    >
      {children}
    </button>
  );
}

// ─── Dice display ─────────────────────────────────────────────────────────────
function DiceResult({ d4, d6, total }: { d4: number; d6: number; total: number }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-lg bg-gray-800 border-2 border-purple-500/60 flex items-center justify-center text-2xl font-bold text-purple-300 shadow-lg shadow-purple-900/40">
          {d4}
        </div>
        <span className="text-xs text-gray-500 mt-1">d4</span>
      </div>
      <span className="text-gray-500 text-lg">+</span>
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 rounded-lg bg-gray-800 border-2 border-pink-500/60 flex items-center justify-center text-2xl font-bold text-pink-300 shadow-lg shadow-pink-900/40">
          {d6}
        </div>
        <span className="text-xs text-gray-500 mt-1">d6</span>
      </div>
      <span className="text-gray-500 text-lg">=</span>
      <div className="flex flex-col items-center">
        <div className="w-14 h-14 rounded-xl bg-gray-900 border-2 border-yellow-500/70 flex items-center justify-center text-3xl font-bold text-yellow-300 shadow-lg shadow-yellow-900/40">
          {total}
        </div>
        <span className="text-xs text-gray-500 mt-1">tổng</span>
      </div>
    </div>
  );
}

// ─── Character card (secret — only owner sees) ───────────────────────────────
function MyCharacterCard({ characterId, faction, maxHp, winCondition, skillDescription }: {
  characterId: string; faction: SHFaction; maxHp: number; winCondition: string; skillDescription: string;
}) {
  const char = getCharacterDef(characterId);
  if (!char) return null;
  return (
    <div className={`rounded-xl p-4 border ${factionBorder(faction)} ${factionBg(faction)} bg-gradient-to-br`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">{char.icon}</span>
        <div>
          <p className={`font-bold text-lg ${factionColor(faction)}`}>{char.name}</p>
          <p className="text-xs text-gray-400">{faction} · {maxHp} HP</p>
        </div>
      </div>
      <p className="text-xs text-gray-300 mb-1">
        <span className="text-yellow-400 font-semibold">🏆 {char.skillName}: </span>{skillDescription}
      </p>
      <p className="text-xs text-gray-400 mt-1">
        <span className="text-emerald-400 font-semibold">🎯 Điều kiện thắng: </span>{winCondition}
      </p>
    </div>
  );
}

// ─── HP Bar ───────────────────────────────────────────────────────────────────
function HpBar({ damage, maxHp }: { damage: number; maxHp?: number }) {
  if (!maxHp) return <span className="text-xs text-gray-500">—</span>;
  const pct = Math.min(100, (damage / maxHp) * 100);
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full bg-gray-700 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${hpColor(damage, maxHp)}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-300 whitespace-nowrap">{damage}/{maxHp}</span>
    </div>
  );
}

// ─── Equipment tooltip popup ──────────────────────────────────────────────────
function EquipmentTooltip({ cardId, onClose }: { cardId: string; onClose: () => void }) {
  const c = getCardDef(cardId);
  if (!c) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className={`relative max-w-xs w-full mx-4 rounded-xl border-2 ${c.borderClass} ${c.bgClass} p-4 shadow-2xl`}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-white text-lg leading-none"
        >✕</button>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{c.icon}</span>
          <div>
            <p className={`font-bold text-sm ${c.textClass}`}>{c.nameVI}</p>
            <p className="text-xs text-gray-400">{c.name}</p>
          </div>
        </div>
        <p className={`text-sm leading-relaxed ${c.textClass}`}>{c.description}</p>
      </div>
    </div>
  );
}

// ─── Character tooltip popup ──────────────────────────────────────────────────
function CharacterTooltip({ characterId, onClose }: { characterId: string; onClose: () => void }) {
  const c = getCharacterDef(characterId);
  if (!c) return null;
  const borderCls = c.borderClass ?? 'border-gray-500';
  const bgCls = c.bgClass ?? 'bg-gray-800';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className={`relative max-w-sm w-full mx-4 rounded-xl border-2 ${borderCls} ${bgCls} p-4 shadow-2xl`}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-white text-lg leading-none"
        >✕</button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-4xl">{c.icon}</span>
          <div>
            <p className={`font-bold text-base ${factionColor(c.faction)}`}>{c.name}</p>
            <p className="text-xs text-gray-400">{c.faction} · {c.hp} HP tối đa</p>
          </div>
        </div>

        {/* Skill */}
        <div className="bg-black/30 rounded-lg p-3 mb-3 border border-white/10">
          <p className="text-xs text-yellow-400 font-semibold mb-1">✨ Kỹ năng: {c.skillName}</p>
          <p className="text-sm text-gray-200 leading-relaxed">{c.skillDescription}</p>
          {c.skillTiming && (
            <p className="text-xs text-gray-500 mt-1">⏰ Thời điểm: {c.skillTiming.replace(/_/g, ' ')}</p>
          )}
          {c.skillUsage && (
            <p className="text-xs text-gray-500">🔄 Cách dùng: {c.skillUsage.replace(/_/g, ' ')}</p>
          )}
        </div>

        {/* Win condition */}
        <div className="bg-black/20 rounded-lg px-3 py-2 border border-emerald-700/30">
          <p className="text-xs text-emerald-400 font-semibold mb-0.5">🏆 Điều kiện thắng</p>
          <p className="text-sm text-gray-200 leading-relaxed">{c.winCondition}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Equipment pills ──────────────────────────────────────────────────────────
function EquipmentList({ equipment }: { equipment: string[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (equipment.length === 0) return <span className="text-xs text-gray-600">—</span>;
  return (
    <>
      <div className="flex flex-wrap gap-1">
        {equipment.map(id => {
          const c = getCardDef(id);
          return (
            <button
              key={id}
              onClick={() => setSelectedId(id)}
              className={`text-xs px-1.5 py-0.5 rounded border cursor-pointer hover:brightness-125 active:scale-95 transition-all ${c?.borderClass ?? 'border-gray-600'} ${c?.bgClass ?? 'bg-gray-800'} ${c?.textClass ?? 'text-gray-300'}`}
            >
              {c?.icon} {c?.nameVI ?? id}
            </button>
          );
        })}
      </div>
      {selectedId && (
        <EquipmentTooltip cardId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}

// ─── Area Card ────────────────────────────────────────────────────────────────
function AreaCard({
  areaId, playersHere, isMyArea, isActive, myId, playerMap, onClick,
}: {
  areaId: SHArea;
  playersHere: SHPublicPlayerState[];
  isMyArea: boolean;
  isActive: boolean;
  myId: string;
  playerMap: Record<string, string>;
  onClick?: () => void;
}) {
  const a = AREAS[areaId];
  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl p-3 border bg-gradient-to-br ${areaColor(areaId)} transition-all duration-200
        ${isActive ? 'ring-2 ring-yellow-400/70 cursor-pointer hover:brightness-110' : ''}
        ${isMyArea ? 'ring-2 ring-white/30' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{a.icon}</span>
        <div>
          <p className="text-sm font-bold text-white/90 leading-tight">{a.nameVI}</p>
          <p className="text-xs text-gray-400 leading-tight">{a.name}</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-2 leading-tight">{a.description}</p>
      {playersHere.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {playersHere.map(p => {
            const isSelf = p.playerId === myId;
            const showFaction = p.revealed || isSelf;
            const name = playerMap[p.playerId] ?? p.playerId.slice(0, 6);
            return (
              <span
                key={p.playerId}
                className={`text-xs px-1.5 py-0.5 rounded-full border ${showFaction ? factionBorder(p.faction) : 'border-gray-600'} ${showFaction ? factionBg(p.faction) : 'bg-gray-800/60'} ${showFaction ? factionColor(p.faction) : 'text-gray-300'}`}
              >
                {isSelf ? `★ ${name}` : name}
              </span>
            );
          })}
        </div>
      )}
      {isMyArea && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white/70 animate-pulse" />
      )}
    </div>
  );
}

// ─── Player row ───────────────────────────────────────────────────────────────
function PlayerRow({
  p, myId, isCurrentTurn, name, canBeAttacked, onAttack, onSelectForHermit,
}: {
  p: SHPublicPlayerState;
  myId: string;
  isCurrentTurn: boolean;
  name: string;
  canBeAttacked: boolean;
  onAttack?: () => void;
  onSelectForHermit?: () => void;
}) {
  const [showCharInfo, setShowCharInfo] = useState<string | null>(null);
  const isMe = p.playerId === myId;
  const faction = p.revealed ? p.faction : undefined;
  return (
    <div className={`rounded-xl p-3 border transition-all ${factionBorder(faction)} ${factionBg(faction)}
      ${!p.isAlive ? 'opacity-50' : ''} ${isCurrentTurn ? 'ring-2 ring-yellow-400/60' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isCurrentTurn && <span className="text-yellow-400 text-sm">▶</span>}
          <p className={`font-semibold text-sm ${isMe ? 'text-white' : 'text-gray-200'}`}>
            {name} {isMe && '(bạn)'}
          </p>
          {!p.isAlive && <Badge cls="bg-gray-700 text-gray-300">💀 Chết</Badge>}
        </div>
        <div className="flex gap-1">
          {p.revealed && p.characterId && (
            <button
              onClick={() => setShowCharInfo(p.characterId!)}
              className={`px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer hover:brightness-125 active:scale-95 transition-all ${factionBg(p.faction)} ${factionColor(p.faction)} border ${factionBorder(p.faction)}`}
            >
              {getCharacterDef(p.characterId)?.icon} {getCharacterDef(p.characterId)?.name ?? p.characterId}
            </button>
          )}
          {!p.revealed && <Badge cls="bg-gray-700 text-gray-400">❓ Ẩn</Badge>}
        </div>
      </div>
      {showCharInfo && (
        <CharacterTooltip characterId={showCharInfo} onClose={() => setShowCharInfo(null)} />
      )}

      {/* Show full HP only for yourself or revealed players */}
      <HpBar damage={p.damage} maxHp={(isMe || p.revealed) ? p.maxHp : undefined} />
      <div className="mt-2">
        <EquipmentList equipment={p.equipment} />
      </div>
      <div className="mt-2 flex gap-2">
        {canBeAttacked && onAttack && p.isAlive && (
          <Btn danger onClick={onAttack} className="text-xs py-1 px-3">⚔️ Tấn công</Btn>
        )}
        {onSelectForHermit && p.isAlive && (
          <Btn onClick={onSelectForHermit} className="text-xs py-1 px-3">📜 Đưa Hermit</Btn>
        )}
      </div>
    </div>
  );
}

// ─── Game log ─────────────────────────────────────────────────────────────────
function GameLog({ entries }: { entries: { ts: number; type: string; msg: string }[] }) {
  return (
    <div className="bg-gray-950/80 rounded-xl border border-gray-700/40 p-3 h-40 overflow-y-auto">
      <p className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wider">Game Log</p>
      {entries.length === 0 && <p className="text-xs text-gray-600 italic">Chưa có sự kiện nào.</p>}
      {entries.map((e, i) => (
        <p key={i} className="text-xs text-gray-300 py-0.5 border-b border-gray-800/60 last:border-0">
          {e.msg}
        </p>
      ))}
    </div>
  );
}

// ─── Phase banner ─────────────────────────────────────────────────────────────
function PhaseBanner({ phase, currentName, isMyTurn }: { phase: string; currentName: string; isMyTurn: boolean }) {
  const phaseLabel: Record<string, string> = {
    ROLL: '🎲 Lăn xúc xắc di chuyển',
    CHOOSE_AREA: '📍 Chọn khu vực',
    AREA_ACTION: '🏠 Dùng hiệu ứng khu vực',
    CARD_RESOLVE: '🃏 Chọn mục tiêu cho lá bài',
    GIVE_HERMIT: '📜 Chọn người nhận Hermit Card',
    RESOLVE_HERMIT: '📜 Giải Hermit Card',
    ATTACK: '⚔️ Tấn công (tuỳ chọn)',
    ATTACK_TARGET: '⚔️ Chọn mục tiêu tấn công',
    SKILL_RESOLVE: '✨ Kích hoạt kỹ năng',
    GAME_OVER: '🏆 Game kết thúc!',
  };
  return (
    <div className={`rounded-xl p-3 border text-center ${isMyTurn ? 'border-yellow-500/60 bg-yellow-900/20' : 'border-gray-700/40 bg-gray-900/40'}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Lượt của</p>
      <p className="font-bold text-white text-base">{currentName}</p>
      <p className="text-sm text-gray-300 mt-1">{phaseLabel[phase] ?? phase}</p>
      {isMyTurn && <p className="text-xs text-yellow-400 mt-1 animate-pulse">← Đến lượt bạn!</p>}
    </div>
  );
}

// ─── Action Panel ─────────────────────────────────────────────────────────────
function ActionPanel({
  gs, myData, myPublicState, isMyTurn, isMyHermitTurn, isUnknown,
  validAttackTargets, players,
  onRoll, onChooseArea, onSkipArea, onUseArea, onGiveHermit, onResolveHermit,
  onAttack, onSkipAttack, onReveal, onUseSkill, onResolveSkill,
}: {
  gs: SHGameState;
  myData: ReturnType<typeof import('./useShadowHunter').useShadowHunter>['myData'];
  myPublicState: SHPublicPlayerState | null;
  isMyTurn: boolean;
  isMyHermitTurn: boolean;
  isUnknown: boolean;
  validAttackTargets: string[];
  players: { id: string; name: string }[];
  onRoll: () => void;
  onChooseArea: (a: SHArea) => void;
  onSkipArea: () => void;
  onUseArea: (opts?: Parameters<ReturnType<typeof import('./useShadowHunter').useShadowHunter>['useAreaAction']>[0]) => void;
  onGiveHermit: (targetId: string) => void;
  onResolveHermit: (lie?: boolean) => void;
  onAttack: (targetId: string) => void;
  onSkipAttack: () => void;
  onReveal: () => void;
  onUseSkill: (opts?: { targetPlayerId?: string }) => void;
  onResolveSkill: (accept: boolean) => void;
}) {
  const [selectedTarget, setSelectedTarget] = useState('');
  const [weirdWoodsAction, setWeirdWoodsAction] = useState<'DAMAGE' | 'HEAL'>('DAMAGE');
  const [deckChoice, setDeckChoice] = useState<'white' | 'black' | 'hermit'>('white');
  const [selectedEquip, setSelectedEquip] = useState('');

  const myId = myPublicState?.playerId ?? '';
  const myArea = myPublicState?.area;
  const myAreaDef = myArea ? AREAS[myArea] : null;
  const charDef = myData.characterId ? getCharacterDef(myData.characterId) : null;

  const otherPlayers = players.filter(p => p.id !== myId);
  const alivePlayers = otherPlayers.filter(p => gs.players[p.id]?.isAlive);

  // ── Phase: ROLL
  if (isMyTurn && gs.turnPhase === 'ROLL') {
    return (
      <div className="space-y-3">
        <Btn onClick={onRoll} className="w-full py-3 text-lg bg-purple-800 hover:bg-purple-700 border-purple-500">
          🎲 Lăn Xúc Xắc
        </Btn>
        {/* Reveal button — available any time during own turn if not yet revealed */}
        {!myPublicState?.revealed && myData.characterId && myData.characterId !== 'DANIEL' && (
          <Btn onClick={onReveal} className="w-full bg-violet-800 hover:bg-violet-700 border-violet-500">
            👁️ Reveal nhân vật
          </Btn>
        )}
        {/* Franklin/George skill at turn start — auto-reveals when used, no pre-reveal required */}
        {charDef && ['FRANKLIN_D6_DAMAGE', 'GEORGE_D4_DAMAGE'].includes(charDef.skillId) && !myData.usedSkill && (
          <div className="border border-blue-700/40 rounded-lg p-2 space-y-2">
            <p className="text-xs text-blue-300 font-semibold">✨ {charDef.skillName}</p>
            <p className="text-xs text-gray-400">{charDef.skillDescription}</p>
            <select value={selectedTarget} onChange={e => setSelectedTarget(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white">
              <option value="">— Chọn mục tiêu —</option>
              {alivePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <Btn onClick={() => selectedTarget && onUseSkill({ targetPlayerId: selectedTarget })} disabled={!selectedTarget} className="w-full">
              Dùng {charDef.skillName}
            </Btn>
          </div>
        )}
      </div>
    );
  }

  // ── Phase: CHOOSE_AREA
  if (isMyTurn && gs.turnPhase === 'CHOOSE_AREA') {
    const areas = Object.values(AREAS).filter(a => a.id !== myArea);
    return (
      <div className="space-y-2">
        <p className="text-sm text-yellow-300 font-semibold">📍 Roll = 7 — chọn khu vực:</p>
        {areas.map(a => (
          <Btn key={a.id} onClick={() => onChooseArea(a.id as SHArea)} className="w-full text-left">
            {a.icon} {a.nameVI}
          </Btn>
        ))}
      </div>
    );
  }

  // ── Phase: AREA_ACTION
  if (isMyTurn && gs.turnPhase === 'AREA_ACTION') {
    return (
      <div className="space-y-2">
        <p className="text-sm text-gray-300">Khu vực hiện tại: <span className="font-bold text-white">{myAreaDef?.icon} {myAreaDef?.nameVI}</span></p>
        {myArea === 'UNDERWORLD_GATE' && (
          <div className="flex gap-2">
            {(['white', 'black', 'hermit'] as const).map(d => (
              <button key={d} onClick={() => setDeckChoice(d)} className={`flex-1 py-1 rounded text-xs font-semibold border transition ${deckChoice === d ? 'bg-yellow-800 border-yellow-500 text-yellow-200' : 'bg-gray-800 border-gray-600 text-gray-400'}`}>
                {d === 'white' ? '⬜ White' : d === 'black' ? '⬛ Black' : '🟢 Hermit'}
              </button>
            ))}
          </div>
        )}
        {myArea === 'WEIRD_WOODS' && (
          <div className="flex gap-2">
            <button onClick={() => setWeirdWoodsAction('DAMAGE')} className={`flex-1 py-1 rounded text-xs border ${weirdWoodsAction === 'DAMAGE' ? 'bg-red-800 border-red-500 text-red-200' : 'bg-gray-800 border-gray-600 text-gray-400'}`}>💀 Gây 2 damage</button>
            <button onClick={() => setWeirdWoodsAction('HEAL')} className={`flex-1 py-1 rounded text-xs border ${weirdWoodsAction === 'HEAL' ? 'bg-green-800 border-green-500 text-green-200' : 'bg-gray-800 border-gray-600 text-gray-400'}`}>💚 Hồi 1 damage</button>
          </div>
        )}
        {(myArea === 'WEIRD_WOODS' || myArea === 'ERSTWHILE_ALTAR') && (
          <select value={selectedTarget} onChange={e => setSelectedTarget(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white">
            <option value="">— Chọn người chơi —</option>
            {alivePlayers.filter(p => p.id !== myId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        {myArea === 'ERSTWHILE_ALTAR' && selectedTarget && (
          <select value={selectedEquip} onChange={e => setSelectedEquip(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white">
            <option value="">— Chọn Equipment để cướp —</option>
            {(gs.players[selectedTarget]?.equipment ?? []).map(eq => {
              const c = getCardDef(eq);
              return <option key={eq} value={eq}>{c?.icon} {c?.nameVI ?? eq}</option>;
            })}
          </select>
        )}
        <div className="flex gap-2">
          <Btn onClick={() => onUseArea({
            deckChoice,
            targetPlayerId: selectedTarget || undefined,
            weirdWoodsAction: myArea === 'WEIRD_WOODS' ? weirdWoodsAction : undefined,
            stealCardId: selectedEquip || undefined,
          })} className="flex-1 bg-indigo-800 hover:bg-indigo-700 border-indigo-500">
            {myAreaDef?.icon} Dùng hiệu ứng
          </Btn>
          <Btn onClick={onSkipArea} className="flex-1">Bỏ qua</Btn>
        </div>
      </div>
    );
  }

  // ── Phase: CARD_RESOLVE
  if (isMyTurn && gs.turnPhase === 'CARD_RESOLVE') {
    const eff = gs.pendingEffect;
    const cardDef = eff?.cardId ? getCardDef(eff.cardId) : null;
    const needsEquipTarget = eff?.type === 'AREA_ALTAR' || eff?.cardId === 'BLACK_MOODY_GOBLIN' || eff?.cardId === 'BLACK_BANANA_PEEL';
    return (
      <div className="space-y-2">
        {cardDef && (
          <div className={`p-3 rounded-lg border ${cardDef.borderClass} ${cardDef.bgClass}`}>
            <p className={`text-sm font-bold ${cardDef.textClass}`}>{cardDef.icon} {cardDef.nameVI}</p>
            <p className="text-xs text-gray-300 mt-1">{cardDef.description}</p>
          </div>
        )}
        {eff?.type === 'AREA_WEIRD_WOODS' && (
          <div className="flex gap-2">
            <button onClick={() => setWeirdWoodsAction('DAMAGE')} className={`flex-1 py-1 rounded text-xs border ${weirdWoodsAction === 'DAMAGE' ? 'bg-red-800 border-red-500 text-red-200' : 'bg-gray-800 border-gray-600 text-gray-400'}`}>💀 Gây 2 damage</button>
            <button onClick={() => setWeirdWoodsAction('HEAL')} className={`flex-1 py-1 rounded text-xs border ${weirdWoodsAction === 'HEAL' ? 'bg-green-800 border-green-500 text-green-200' : 'bg-gray-800 border-gray-600 text-gray-400'}`}>💚 Hồi 1 damage</button>
          </div>
        )}
        <select value={selectedTarget} onChange={e => setSelectedTarget(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white">
          <option value="">— Chọn mục tiêu —</option>
          {alivePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {needsEquipTarget && selectedTarget && (
          <select value={selectedEquip} onChange={e => setSelectedEquip(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white">
            <option value="">— Chọn Equipment —</option>
            {(gs.players[selectedTarget]?.equipment ?? []).map(eq => {
              const c = getCardDef(eq);
              return <option key={eq} value={eq}>{c?.icon} {c?.nameVI ?? eq}</option>;
            })}
          </select>
        )}
        <Btn onClick={() => {
          const fn = (window as unknown as Record<string, unknown>).__shResolveCardEffect;
          if (typeof fn === 'function') {
            if (eff?.type === 'AREA_WEIRD_WOODS') {
              fn(selectedTarget || undefined, undefined, weirdWoodsAction);
            } else {
              fn(selectedTarget || undefined, selectedEquip || undefined);
            }
          }
        }} disabled={!selectedTarget} className="w-full bg-indigo-800 hover:bg-indigo-700 border-indigo-500">
          Xác nhận
        </Btn>
      </div>
    );
  }

  // ── Phase: GIVE_HERMIT
  if (isMyTurn && gs.turnPhase === 'GIVE_HERMIT') {
    return (
      <div className="space-y-2">
        <p className="text-sm text-green-300 font-semibold">📜 Chọn người nhận Hermit Card:</p>
        {alivePlayers.map(p => (
          <Btn key={p.id} onClick={() => onGiveHermit(p.id)} className="w-full">
            {p.name}
          </Btn>
        ))}
      </div>
    );
  }

  // ── Phase: RESOLVE_HERMIT (for the receiver)
  if (isMyHermitTurn && gs.turnPhase === 'RESOLVE_HERMIT') {
    const cardId = myData.pendingHermitCardId;
    const card = cardId ? getCardDef(cardId) : null;
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-green-600/40 bg-green-900/20 p-4">
          <p className="text-sm font-bold text-green-300 mb-2">📜 Bạn nhận được Hermit Card!</p>
          {card && (
            <>
              <p className={`text-sm font-bold ${card.textClass}`}>{card.icon} {card.nameVI}</p>
              <p className="text-xs text-gray-300 mt-1">{card.description}</p>
            </>
          )}
        </div>
        <Btn onClick={() => onResolveHermit(false)} className="w-full bg-green-800 hover:bg-green-700 border-green-600">
          ✅ Giải thật (honest)
        </Btn>
        {isUnknown && (
          <Btn onClick={() => onResolveHermit(true)} danger className="w-full">
            🎭 Nói dối (Unknown skill)
          </Btn>
        )}
      </div>
    );
  }

  // ── Phase: ATTACK
  if (isMyTurn && gs.turnPhase === 'ATTACK') {
    return (
      <div className="space-y-2">
        {validAttackTargets.length > 0 ? (
          <>
            <p className="text-sm text-red-300 font-semibold">⚔️ Chọn mục tiêu tấn công:</p>
            <p className="text-xs text-gray-500">Chỉ người cùng nhóm khu vực mới trong tầm.</p>
            {validAttackTargets.map(id => {
              const p = players.find(q => q.id === id);
              return (
                <Btn key={id} danger onClick={() => onAttack(id)} className="w-full">
                  ⚔️ Tấn công {p?.name ?? id}
                </Btn>
              );
            })}
          </>
        ) : (
          <p className="text-xs text-gray-500 text-center italic">Không có ai trong tầm tấn công (khác nhóm khu vực).</p>
        )}
        <Btn onClick={onSkipAttack} className="w-full">Bỏ qua tấn công → Kết thúc lượt</Btn>
      </div>
    );
  }

  // ── Phase: ATTACK_TARGET (Masamune force)
  if (isMyTurn && gs.turnPhase === 'ATTACK_TARGET') {
    return (
      <div className="space-y-2">
        <p className="text-sm text-yellow-300 font-semibold">⚔️ Masamune: bắt buộc tấn công!</p>
        {validAttackTargets.map(id => {
          const p = players.find(q => q.id === id);
          return <Btn key={id} danger onClick={() => onAttack(id)} className="w-full">{p?.name ?? id}</Btn>;
        })}
      </div>
    );
  }

  // ── Phase: SKILL_RESOLVE (Werewolf counter)
  if (gs.turnPhase === 'SKILL_RESOLVE' && gs.pendingEffect?.actorPlayerId === myPublicState?.playerId) {
    const eff = gs.pendingEffect;
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-red-600/40 bg-red-900/20 p-4">
          <p className="text-sm font-bold text-red-300">🐺 Werewolf phản công?</p>
          <p className="text-xs text-gray-400 mt-1">Bạn vừa bị tấn công bởi {eff?.attackerPlayerId}. Có muốn phản công không?</p>
        </div>
        <div className="flex gap-2">
          <Btn danger onClick={() => onResolveSkill(true)} className="flex-1">⚔️ Phản công!</Btn>
          <Btn onClick={() => onResolveSkill(false)} className="flex-1">Bỏ qua</Btn>
        </div>
      </div>
    );
  }

  // ── Reveal button (always available unless already revealed or Daniel)
  if (!myPublicState?.revealed && myData.characterId && myData.characterId !== 'DANIEL') {
    return (
      <div>
        <Btn onClick={onReveal} className="w-full bg-violet-800 hover:bg-violet-700 border-violet-500">
          👁️ Reveal nhân vật (để dùng skill)
        </Btn>
        <p className="text-xs text-gray-500 mt-2 text-center">Waiting for current player to act…</p>
      </div>
    );
  }

  return <p className="text-sm text-gray-500 text-center italic">Đang đợi lượt của mình…</p>;
}

// ─── Game Over Screen ─────────────────────────────────────────────────────────
function GameOverScreen({
  gs, players, myId, onReset, isHost,
}: {
  gs: SHGameState; players: { id: string; name: string }[]; myId: string; onReset: () => void; isHost: boolean;
}) {
  const winners = gs.winnerIds;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-yellow-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-bold text-yellow-300 text-center mb-4">🏆 Game Kết Thúc!</h2>
        <div className="space-y-2 mb-4">
          {players.map(p => {
            const pub = gs.players[p.id];
            const charId = gs.revealedAll[p.id] ?? pub?.characterId;
            const char = charId ? getCharacterDef(charId) : null;
            const isWinner = winners.includes(p.id);
            return (
              <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isWinner ? 'border-yellow-500/60 bg-yellow-900/20' : 'border-gray-700/40 bg-gray-800/40'}`}>
                {isWinner && <span className="text-yellow-400 text-lg">🏆</span>}
                <span className="text-2xl">{char?.icon ?? '❓'}</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-white">{p.name} {p.id === myId && '(bạn)'}</p>
                  <p className={`text-xs ${factionColor(char?.faction)}`}>{char?.name ?? '???'} — {char?.faction}</p>
                </div>
                {isWinner && <Badge cls="bg-yellow-800 text-yellow-200 border border-yellow-500">Thắng!</Badge>}
              </div>
            );
          })}
        </div>
        {isHost && <Btn onClick={onReset} className="w-full">🔄 Chơi lại</Btn>}
      </div>
    </div>
  );
}

// ─── Lobby ────────────────────────────────────────────────────────────────────
function SHLobby({
  room, players, isHost, playerCount, onStart, onShowGuide,
}: {
  room: Room;
  players: { id: string; name: string }[];
  isHost: boolean;
  playerCount: number;
  onStart: () => void;
  onShowGuide: () => void;
}) {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const dist = PLAYER_DISTRIBUTION[playerCount];

  const copyCode = () => {
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">
        {/* Title */}
        <div className="text-center">
          <p className="text-4xl mb-2">🌑</p>
          <h1 className="text-3xl font-bold text-purple-300">Shadow Hunters</h1>
          <p className="text-gray-400 text-sm mt-1">3 phe ẩn danh tranh giành sinh tử</p>
        </div>

        {/* Invite section */}
        <div className="bg-gray-900 rounded-xl border border-purple-700/40 p-4 space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">🔗 Mời bạn bè</p>

          {/* Room code */}
          <div className="flex items-center justify-between bg-gray-800/60 rounded-lg px-4 py-3 border border-gray-700/40">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Mã phòng</p>
              <p className="font-mono text-2xl font-black tracking-[0.25em] text-white">{room.roomCode}</p>
            </div>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-700/40 hover:bg-purple-700/70 border border-purple-600/40 text-purple-300 text-sm font-semibold transition-all"
            >
              {copied ? '✅ Đã copy' : '📋 Copy'}
            </button>
          </div>

          {/* QR toggle */}
          <button
            onClick={() => setShowQR(v => !v)}
            className={`w-full flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all
              ${showQR
                ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                : 'border-gray-700/40 bg-gray-800/30 text-gray-400 hover:bg-gray-700/40 hover:text-white'}`}
          >
            <span>📱</span> {showQR ? 'Ẩn QR Code' : 'Hiện QR Code'}
          </button>

          {showQR && (
            <div className="flex justify-center pt-1 pb-2">
              <QRCodeDisplay roomId={room.id} roomCode={room.roomCode} gameType="shadowhunter" />
            </div>
          )}
        </div>

        {/* Player list */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
          <p className="text-sm text-gray-400 mb-3">Người chơi ({playerCount}/8):</p>
          <div className="space-y-2">
            {players.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 border border-gray-700/40">
                <span className="text-lg">👤</span>
                <span className="font-semibold text-sm">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Character distribution */}
        {dist && (
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Phân bổ nhân vật</p>
            <div className="flex gap-4 justify-center">
              <div className="text-center"><p className="text-2xl font-bold text-blue-400">{dist.hunters}</p><p className="text-xs text-gray-500">Hunter</p></div>
              <div className="text-center"><p className="text-2xl font-bold text-red-400">{dist.shadows}</p><p className="text-xs text-gray-500">Shadow</p></div>
              <div className="text-center"><p className="text-2xl font-bold text-gray-400">{dist.neutrals}</p><p className="text-xs text-gray-500">Neutral</p></div>
            </div>
          </div>
        )}

        {playerCount < 4 && <p className="text-center text-yellow-400 text-sm">⚠️ Cần ít nhất 4 người chơi</p>}

        {isHost && (
          <Btn onClick={onStart} disabled={playerCount < 4 || playerCount > 8} className="w-full py-4 text-lg bg-purple-800 hover:bg-purple-700 border-purple-500">
            🎮 Bắt đầu Game
          </Btn>
        )}
        {!isHost && <p className="text-center text-gray-500 text-sm italic">Đang chờ host bắt đầu…</p>}

        <button
          onClick={onShowGuide}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-700/40 bg-gray-900/40 text-gray-400 hover:text-white hover:bg-gray-800/60 text-sm transition-all"
        >
          📖 Hướng dẫn chơi
        </button>
      </div>
    </div>
  );
}

// ─── Guide ────────────────────────────────────────────────────────────────────
function GuideBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-700/50 bg-gray-800/40 p-4">
      <p className="font-bold text-white text-sm mb-2">{title}</p>
      <div className="text-sm text-gray-300 space-y-1 leading-relaxed">{children}</div>
    </div>
  );
}

function SHGuide({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'overview' | 'areas' | 'cards' | 'characters'>('overview');

  const tabs = [
    { id: 'overview',    label: '📖 Tổng quan' },
    { id: 'areas',       label: '🗺️ Khu vực' },
    { id: 'cards',       label: '🃏 Thẻ bài' },
    { id: 'characters',  label: '🦸 Nhân vật' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/98 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🌑</span>
          <div>
            <h2 className="font-black text-white text-lg leading-tight">Shadow Hunters</h2>
            <p className="text-xs text-gray-500">Hướng dẫn chơi</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors text-lg"
        >✕</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-gray-800 flex-shrink-0 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all
              ${tab === t.id ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* ── TỔNG QUAN ── */}
        {tab === 'overview' && (
          <>
            <GuideBlock title="🎯 Mục tiêu">
              Mỗi người chơi có một nhân vật bí mật thuộc 1 trong 3 phe. Tiêu diệt kẻ thù hoặc hoàn thành điều kiện chiến thắng riêng trước khi game kết thúc.
            </GuideBlock>

            <GuideBlock title="⚔️ Ba phe">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold min-w-[70px]">🏹 Hunter</span>
                  <span>Thắng khi tất cả Shadow bị tiêu diệt.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-400 font-bold min-w-[70px]">🩸 Shadow</span>
                  <span>Thắng khi tất cả Hunter chết hoặc ≥3 Neutral chết.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-400 font-bold min-w-[70px]">❓ Neutral</span>
                  <span>Mỗi nhân vật có điều kiện thắng riêng — không hề phe với ai.</span>
                </div>
              </div>
            </GuideBlock>

            <GuideBlock title="🔄 Lượt chơi">
              <ol className="list-decimal list-inside space-y-1">
                <li><span className="text-purple-300 font-semibold">Lăn xúc xắc</span> — roll d4 + d6, di chuyển đến khu vực tương ứng.</li>
                <li><span className="text-purple-300 font-semibold">Dùng hiệu ứng</span> — tùy chọn kích hoạt hiệu ứng khu vực.</li>
                <li><span className="text-purple-300 font-semibold">Tấn công</span> — tùy chọn tấn công người cùng nhóm khu vực.</li>
              </ol>
            </GuideBlock>

            <GuideBlock title="🗡️ Chiến đấu">
              <p>Tung <span className="text-purple-300 font-mono">|d6 − d4|</span> để tính sát thương. Kết quả 0 = trượt.</p>
              <p className="mt-1 text-gray-400 text-xs">Tấn công ai? — người cùng <strong>nhóm khu vực</strong> (cặp kề nhau trên bản đồ).</p>
            </GuideBlock>

            <GuideBlock title="👁️ Reveal nhân vật">
              Bạn có thể tự reveal bất kỳ lúc nào. Một số skill <strong>yêu cầu reveal</strong> mới dùng được. Khi chết, nhân vật bị reveal tự động.
            </GuideBlock>

            <GuideBlock title="🗺️ Nhóm khu vực (combat range)">
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { label: 'Nhóm 1', areas: ['🏚️ Lều Ẩn Sĩ', '🌀 Cổng Địa Ngục'] },
                  { label: 'Nhóm 2', areas: ['⛪ Nhà Thờ', '⚰️ Nghĩa Địa'] },
                  { label: 'Nhóm 3', areas: ['🌲 Rừng Ma', '🗿 Bàn Thờ Cũ'] },
                ].map(g => (
                  <div key={g.label} className="bg-gray-900/60 rounded-lg p-2 border border-gray-700/40">
                    <p className="text-gray-500 font-semibold mb-1">{g.label}</p>
                    {g.areas.map(a => <p key={a} className="text-gray-300">{a}</p>)}
                  </div>
                ))}
              </div>
            </GuideBlock>
          </>
        )}

        {/* ── KHU VỰC ── */}
        {tab === 'areas' && (
          <>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Roll d4+d6 để di chuyển</p>
            {[
              { icon: '🏚️', name: 'Lều Ẩn Sĩ', roll: '2–3', color: 'border-indigo-500/40 bg-indigo-900/20', badge: 'Nhóm 1',
                desc: 'Rút 1 Hermit Card. Đọc bí mật rồi đưa cho người khác để giải.' },
              { icon: '🌀', name: 'Cổng Địa Ngục', roll: '4–5', color: 'border-indigo-500/40 bg-indigo-900/20', badge: 'Nhóm 1',
                desc: 'Chọn rút 1 lá từ White, Black hoặc Hermit deck.' },
              { icon: '⛪', name: 'Nhà Thờ', roll: '6', color: 'border-violet-500/40 bg-violet-900/20', badge: 'Nhóm 2',
                desc: 'Rút 1 White Card.' },
              { icon: '⚰️', name: 'Nghĩa Địa', roll: '8', color: 'border-violet-500/40 bg-violet-900/20', badge: 'Nhóm 2',
                desc: 'Rút 1 Black Card.' },
              { icon: '🌲', name: 'Rừng Ma', roll: '9', color: 'border-emerald-500/40 bg-emerald-900/20', badge: 'Nhóm 3',
                desc: 'Chọn 1 người: gây 2 damage HOẶC hồi 1 damage cho họ.' },
              { icon: '🗿', name: 'Bàn Thờ Cũ', roll: '10', color: 'border-emerald-500/40 bg-emerald-900/20', badge: 'Nhóm 3',
                desc: 'Cướp 1 Equipment Card từ người chơi bất kỳ.' },
            ].map(a => (
              <div key={a.name} className={`rounded-xl border p-4 ${a.color}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{a.icon}</span>
                    <div>
                      <p className="font-bold text-white">{a.name}</p>
                      <span className="text-xs text-gray-500 bg-gray-800/60 px-1.5 py-0.5 rounded">{a.badge}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Roll</p>
                    <p className="font-mono font-bold text-yellow-300">{a.roll}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-300">{a.desc}</p>
              </div>
            ))}
            <div className="rounded-xl border border-yellow-600/30 bg-yellow-900/10 p-3">
              <p className="text-xs font-semibold text-yellow-400 mb-1">⚠️ Roll = 7</p>
              <p className="text-sm text-gray-300">Được phép chọn bất kỳ khu vực nào (không thể ở lại khu vực hiện tại).</p>
            </div>
          </>
        )}

        {/* ── THẺ BÀI ── */}
        {tab === 'cards' && (
          <>
            {/* White */}
            <p className="text-xs text-yellow-400 uppercase tracking-wider font-semibold">⬜ White Cards — Nhà Thờ</p>
            {[
              { n: 'Advent', d: 'Hunter: reveal + hồi về 0 máu.' },
              { n: 'Blessing', d: 'Chọn 1 người — hồi số máu bằng 1d6.' },
              { n: 'Concealed Knowledge', d: 'Được chơi thêm 1 lượt nữa.' },
              { n: 'First Aid', d: 'Đặt damage của 1 người thành 7.' },
              { n: 'Flare of Judgement', d: 'Tất cả người khác nhận 2 damage.' },
              { n: 'Guardian Angel', d: 'Miễn damage từ attack đến đầu lượt tiếp theo.' },
              { n: 'Holy Water of Healing ×2', d: 'Hồi 2 damage cho bản thân.' },
              { n: 'Chocolate', d: '[Expansion] Tên A/E/U: reveal + hồi về 0 máu.' },
              { n: 'Disenchant Mirror', d: '[Expansion] Tên V/W: bắt buộc reveal.' },
            ].map(c => (
              <div key={c.n} className="flex items-start gap-3 p-3 rounded-lg border border-yellow-700/30 bg-yellow-900/10">
                <span className="text-lg mt-0.5">✨</span>
                <div><p className="font-semibold text-yellow-200 text-sm">{c.n}</p><p className="text-xs text-gray-400">{c.d}</p></div>
              </div>
            ))}
            <p className="text-xs text-yellow-400 uppercase tracking-wider font-semibold mt-2">🛡️ White Equipment</p>
            {[
              { n: 'Fortune Brooch', d: 'Miễn damage từ Weird Woods.' },
              { n: 'Holy Robe', d: 'Gây ít hơn 1 damage và nhận ít hơn 1 damage khi attack.' },
              { n: 'Mystic Compass', d: 'Roll di chuyển 2 lần, chọn kết quả nào muốn dùng.' },
              { n: 'Silver Rosary', d: 'Khi attack giết người, lấy toàn bộ Equipment của họ.' },
              { n: 'Spear of Longinus', d: 'Hunter + attack thành công: reveal để gây thêm 2 damage.' },
              { n: 'Talisman', d: 'Miễn damage từ Bloodthirsty Spider, Vampire Bat, Dynamite.' },
            ].map(c => (
              <div key={c.n} className="flex items-start gap-3 p-3 rounded-lg border border-yellow-700/30 bg-yellow-900/10">
                <span className="text-lg mt-0.5">🛡️</span>
                <div><p className="font-semibold text-yellow-200 text-sm">{c.n}</p><p className="text-xs text-gray-400">{c.d}</p></div>
              </div>
            ))}

            {/* Black */}
            <p className="text-xs text-purple-400 uppercase tracking-wider font-semibold mt-2">⬛ Black Cards — Nghĩa Địa</p>
            {[
              { n: 'Banana Peel', d: 'Đưa 1 Equipment cho người khác. Không có → nhận 1 damage.' },
              { n: 'Bloodthirsty Spider', d: 'Chọn 1 người: cả hai nhận 2 damage.' },
              { n: 'Diabolic Ritual', d: 'Shadow: reveal + hồi về 0 máu.' },
              { n: 'Dynamite', d: 'Roll 2d6: khu vực khớp với tổng → mọi người ở đó nhận 3 damage. Tổng 7 = không có gì.' },
              { n: 'Moody Goblin ×2', d: 'Cướp 1 Equipment từ người bất kỳ.' },
              { n: 'Spiritual Doll', d: 'Roll d6: 1–4 → mục tiêu nhận 3 damage; 5–6 → bạn nhận 3 damage.' },
              { n: 'Vampire Bat ×3', d: 'Chọn 1 người: họ nhận 2 damage, bạn hồi 1 damage.' },
            ].map(c => (
              <div key={c.n} className="flex items-start gap-3 p-3 rounded-lg border border-purple-700/30 bg-purple-900/10">
                <span className="text-lg mt-0.5">💜</span>
                <div><p className="font-semibold text-purple-200 text-sm">{c.n}</p><p className="text-xs text-gray-400">{c.d}</p></div>
              </div>
            ))}
            <p className="text-xs text-purple-400 uppercase tracking-wider font-semibold mt-2">⚔️ Black Equipment</p>
            {[
              { n: 'Butcher Knife / Chainsaw / Rusted Broad Axe', d: 'Mỗi vũ khí trang bị: +1 damage khi attack thành công.' },
              { n: 'Handgun', d: 'Tấn công người ở khu vực khác (trừ khu vực bạn đang đứng).' },
              { n: 'Machine Gun', d: 'Tấn công tất cả người trong tầm với cùng một lần roll.' },
              { n: 'Masamune', d: 'Bắt buộc attack nếu có thể. Damage = 1d4, không bao giờ miss.' },
            ].map(c => (
              <div key={c.n} className="flex items-start gap-3 p-3 rounded-lg border border-purple-700/30 bg-purple-900/10">
                <span className="text-lg mt-0.5">⚔️</span>
                <div><p className="font-semibold text-purple-200 text-sm">{c.n}</p><p className="text-xs text-gray-400">{c.d}</p></div>
              </div>
            ))}

            {/* Hermit */}
            <p className="text-xs text-green-400 uppercase tracking-wider font-semibold mt-2">🟢 Hermit Cards — Lều Ẩn Sĩ</p>
            <div className="rounded-xl border border-green-700/30 bg-green-900/10 p-3 text-xs text-gray-400 mb-2">
              Người rút <strong>đọc bí mật</strong> rồi đưa cho người khác. Người nhận giải thẻ dựa trên phe bí mật của mình. Unknown có thể nói dối.
            </div>
            {[
              { n: 'Aid', d: 'Hunter: hồi 1 máu. Không phải Hunter + không có damage: nhận 1 damage.' },
              { n: 'Huddle', d: 'Shadow: hồi 1 máu. Không phải Shadow + không có damage: nhận 1 damage.' },
              { n: 'Nurturance', d: 'Neutral: hồi 1 máu. Không phải Neutral + không có damage: nhận 1 damage.' },
              { n: 'Exorcism', d: 'Shadow: nhận 2 damage.' },
              { n: 'Slap ×2', d: 'Hunter: nhận 1 damage.' },
              { n: 'Spell', d: 'Shadow: nhận 1 damage.' },
              { n: 'Anger ×2', d: 'Hunter hoặc Shadow: đưa 1 Equipment cho người rút, hoặc nhận 1 damage.' },
              { n: 'Blackmail ×2', d: 'Hunter hoặc Neutral: đưa 1 Equipment cho người rút, hoặc nhận 1 damage.' },
              { n: 'Greed ×2', d: 'Neutral hoặc Shadow: đưa 1 Equipment cho người rút, hoặc nhận 1 damage.' },
              { n: 'Prediction', d: 'Cho người rút xem Character Card của mình.' },
              { n: 'Bully', d: '[Expansion] Tên A/B/C/E/U: nhận 1 damage.' },
              { n: 'Tough Lesson', d: '[Expansion] Tên D/F/G/V/W: nhận 2 damage.' },
            ].map(c => (
              <div key={c.n} className="flex items-start gap-3 p-3 rounded-lg border border-green-700/30 bg-green-900/10">
                <span className="text-lg mt-0.5">📜</span>
                <div><p className="font-semibold text-green-200 text-sm">{c.n}</p><p className="text-xs text-gray-400">{c.d}</p></div>
              </div>
            ))}
          </>
        )}

        {/* ── NHÂN VẬT ── */}
        {tab === 'characters' && (
          <>
            {/* Hunter */}
            <p className="text-xs text-blue-400 uppercase tracking-wider font-semibold">🏹 Hunter — Thắng khi tất cả Shadow chết</p>
            {[
              { icon: '⚡', name: 'Emi', hp: 10, skill: 'Teleport', desc: 'Khi di chuyển, có thể đi thẳng đến khu vực liền kề (không roll).', exp: false },
              { icon: '⚔️', name: 'Franklin', hp: 12, skill: 'Lightning', desc: 'Một lần: đầu lượt reveal và gây 1d6 damage cho 1 người.', exp: false },
              { icon: '🛡️', name: 'George', hp: 14, skill: 'Demolish', desc: 'Một lần: đầu lượt reveal và gây 1d4 damage cho 1 người.', exp: false },
              { icon: '🔒', name: 'Ellen', hp: 10, skill: 'Seal', desc: '[Expansion] Một lần: vô hiệu hoá vĩnh viễn skill của 1 nhân vật đã reveal.', exp: true },
              { icon: '💉', name: 'Fu-ka', hp: 12, skill: 'Dynamite Nurse', desc: '[Expansion] Một lần: chọn 1 người — đầu lượt kế tiếp, đặt damage họ thành 7.', exp: true },
              { icon: '🏰', name: 'Gregor', hp: 14, skill: 'Barricade', desc: '[Expansion] Một lần: miễn toàn bộ damage cho đến đầu lượt tiếp theo.', exp: true },
            ].map(c => (
              <div key={c.name} className={`rounded-xl border border-blue-700/40 ${c.exp ? 'bg-blue-950/20' : 'bg-blue-900/20'} p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{c.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-blue-200 text-sm">{c.name} {c.exp && <span className="text-xs text-gray-500">[Mở rộng]</span>}</p>
                    <p className="text-xs text-gray-500">{c.hp} HP</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-800/40 text-blue-300 border border-blue-600/40">{c.skill}</span>
                </div>
                <p className="text-xs text-gray-400">{c.desc}</p>
              </div>
            ))}

            {/* Shadow */}
            <p className="text-xs text-red-400 uppercase tracking-wider font-semibold mt-2">🩸 Shadow — Thắng khi tất cả Hunter chết / ≥3 Neutral chết</p>
            {[
              { icon: '❓', name: 'Unknown', hp: 11, skill: 'Deceit', desc: 'Khi nhận Hermit Card, có thể nói dối kết quả mà không cần reveal.', exp: false },
              { icon: '🧛', name: 'Vampire', hp: 13, skill: 'Suck Blood', desc: 'Khi attack gây damage thành công, hồi 2 máu cho bản thân.', exp: false },
              { icon: '🐺', name: 'Werewolf', hp: 14, skill: 'Counterattack', desc: 'Sau khi bị attack (còn sống), có thể phản công ngay người vừa đánh.', exp: false },
              { icon: '👻', name: 'Ultra Soul', hp: 11, skill: 'Soul Attack', desc: '[Expansion] Đầu lượt (sau reveal): gây 3 damage cho 1 người đang ở Cổng Địa Ngục.', exp: true },
              { icon: '🗡️', name: 'Valkyrie', hp: 13, skill: 'Spear Mastery', desc: '[Expansion] Khi attack: damage = 1d4, không bao giờ miss.', exp: true },
              { icon: '💀', name: 'Wight', hp: 14, skill: 'Revenge', desc: '[Expansion] Một lần: cuối lượt reveal, nhận thêm số lượt = số người đã chết.', exp: true },
            ].map(c => (
              <div key={c.name} className={`rounded-xl border border-red-700/40 ${c.exp ? 'bg-red-950/20' : 'bg-red-900/20'} p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{c.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-red-200 text-sm">{c.name} {c.exp && <span className="text-xs text-gray-500">[Mở rộng]</span>}</p>
                    <p className="text-xs text-gray-500">{c.hp} HP</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-800/40 text-red-300 border border-red-600/40">{c.skill}</span>
                </div>
                <p className="text-xs text-gray-400">{c.desc}</p>
              </div>
            ))}

            {/* Neutral */}
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mt-2">❓ Neutral — Điều kiện riêng từng nhân vật</p>
            {[
              { icon: '👩', name: 'Allie', hp: 8, win: 'Còn sống khi game kết thúc.', skill: 'Một lần: hồi toàn bộ máu về 0 (sau reveal).', exp: false },
              { icon: '🧔', name: 'Bob', hp: 10, win: '≥4 Equipment (4–6 người) / ≥5 Equipment (7–8 người).', skill: '4–6 người: gây ≥2 damage → cướp Equipment thay vì gây damage. 7–8 người: giết → lấy hết Equipment.', exp: false },
              { icon: '🔪', name: 'Charles', hp: 11, win: 'Tự tay giết 1 người khi tổng số người chết ≥3.', skill: 'Sau attack, có thể tự nhận 2 damage để attack thêm lần nữa.', exp: false },
              { icon: '😱', name: 'Daniel', hp: 13, win: 'Là người chết đầu tiên, hoặc còn sống khi Hunter thắng.', skill: 'Khi bất kỳ ai chết, phải tự reveal. Không thể tự reveal lúc khác.', exp: false },
              { icon: '💕', name: 'Agnes', hp: 8, win: 'Người ngồi bên phải (lúc đầu) thắng.', skill: '[Expansion] Đầu lượt: đổi mục tiêu thắng sang người ngồi bên trái.', exp: true },
              { icon: '🎯', name: 'Bryan', hp: 10, win: 'Giết nhân vật HP gốc ≥13, hoặc đang ở Bàn Thờ Cũ khi game kết thúc.', skill: '[Expansion] Nếu giết nhân vật HP ≤12: phải reveal.', exp: true },
              { icon: '✝️', name: 'Catherine', hp: 11, win: 'Là người chết đầu tiên, hoặc là 1 trong 2 người cuối sống sót.', skill: '[Expansion] Đầu lượt sau reveal: hồi 1 máu.', exp: true },
              { icon: '⚰️', name: 'David', hp: 13, win: 'Sở hữu ≥3 trong 4: Talisman, Spear of Longinus, Holy Robe, Silver Rosary.', skill: '[Expansion] Một lần: lấy 1 Equipment từ người đã chết.', exp: true },
            ].map(c => (
              <div key={c.name} className={`rounded-xl border border-gray-700/40 ${c.exp ? 'bg-gray-800/20' : 'bg-gray-800/30'} p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{c.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-gray-200 text-sm">{c.name} {c.exp && <span className="text-xs text-gray-600">[Mở rộng]</span>}</p>
                    <p className="text-xs text-gray-500">{c.hp} HP</p>
                  </div>
                </div>
                <p className="text-xs text-emerald-400 mb-0.5"><span className="font-semibold">🎯 Thắng: </span>{c.win}</p>
                <p className="text-xs text-gray-400"><span className="font-semibold text-yellow-500">✨ Skill: </span>{c.skill}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────
export default function ShadowHunterBoard({ room, players, playerId, isHost }: GameModuleProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [showSkillDesc, setShowSkillDesc] = useState(false);

  const hook = useShadowHunter(room, players, playerId, isHost);
  const {
    gameState, myData, myPublicState, isMyTurn, isMyHermitTurn, isUnknown,
    validAttackTargets, startGame, rollMove, chooseArea, skipAreaAction,
    useAreaAction, giveHermitCard, resolveHermitCard, resolveCardEffect,
    attack, skipAttack, resolveSkill, revealCharacter,
    useSkill: activateSkill, resetGame,
  } = hook;

  // Expose resolveCardEffect to window for ActionPanel (avoids prop drilling complexity)
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__shResolveCardEffect = (targetId?: string, equipId?: string, wwAction?: 'DAMAGE' | 'HEAL') => {
      resolveCardEffect(targetId, equipId, wwAction);
    };
    return () => { delete (window as unknown as Record<string, unknown>).__shResolveCardEffect; };
  }, [resolveCardEffect]);

  // Lobby
  if (!gameState || gameState.turnPhase === undefined) {
    return (
      <>
        {showGuide && <SHGuide onClose={() => setShowGuide(false)} />}
        <SHLobby
          room={room}
          players={players.map(p => ({ id: p.id, name: p.name }))}
          isHost={isHost}
          playerCount={players.length}
          onStart={startGame}
          onShowGuide={() => setShowGuide(true)}
        />
      </>
    );
  }

  // Game over overlay
  const isGameOver = gameState.turnPhase === 'GAME_OVER';

  const playerMap = Object.fromEntries(players.map(p => [p.id, p.name]));

  // Area → players
  const areaPlayers: Record<string, SHPublicPlayerState[]> = {};
  Object.values(gameState.players).forEach(p => {
    if (p.area) {
      areaPlayers[p.area] = [...(areaPlayers[p.area] ?? []), p];
    }
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {isGameOver && (
        <GameOverScreen
          gs={gameState}
          players={players.map(p => ({ id: p.id, name: p.name }))}
          myId={playerId}
          onReset={resetGame}
          isHost={isHost}
        />
      )}

      {/* Guide modal (in-game) */}
      {showGuide && <SHGuide onClose={() => setShowGuide(false)} />}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur-sm border-b border-gray-800 px-4 py-2">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌑</span>
            <span className="font-bold text-purple-300">Shadow Hunters</span>
          </div>
          <div className="flex items-center gap-3">
            {gameState.lastRoll && (
              <div className="flex items-center gap-1 text-sm">
                <span className="text-gray-500">🎲</span>
                <span className="text-purple-300 font-mono">{gameState.lastRoll.d4}</span>
                <span className="text-gray-600">+</span>
                <span className="text-pink-300 font-mono">{gameState.lastRoll.d6}</span>
                <span className="text-gray-600">=</span>
                <span className="text-yellow-300 font-bold font-mono">{gameState.lastRoll.total}</span>
              </div>
            )}
            <button
              onClick={() => setShowGuide(true)}
              className="px-2.5 py-1 rounded-lg border border-gray-700/50 bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/60 text-xs transition-all"
            >
              📖 Luật
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Phase Banner */}
        <PhaseBanner
          phase={gameState.turnPhase}
          currentName={playerMap[gameState.currentTurnPlayerId] ?? gameState.currentTurnPlayerId}
          isMyTurn={isMyTurn}
        />

        {/* My secret character */}
        {myData.characterId && (
          <MyCharacterCard
            characterId={myData.characterId}
            faction={myData.faction}
            maxHp={myData.maxHp}
            winCondition={getCharacterDef(myData.characterId)?.winCondition ?? ''}
            skillDescription={getCharacterDef(myData.characterId)?.skillDescription ?? ''}
          />
        )}

        {/* Main grid: Map + Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Area Map (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">🗺️ Bản Đồ</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(AREAS).map(a => (
                <AreaCard
                  key={a.id}
                  areaId={a.id as SHArea}
                  playersHere={areaPlayers[a.id] ?? []}
                  isMyArea={myPublicState?.area === a.id}
                  isActive={isMyTurn && gameState.turnPhase === 'CHOOSE_AREA' && myPublicState?.area !== a.id}
                  myId={playerId}
                  playerMap={playerMap}
                  onClick={() => {
                    if (isMyTurn && gameState.turnPhase === 'CHOOSE_AREA' && myPublicState?.area !== a.id) {
                      chooseArea(a.id as SHArea);
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {/* Action Panel (1 col) */}
          <div className="space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">🎮 Hành Động</p>
            <div className="bg-gray-900/60 rounded-xl border border-gray-700/40 p-4">
              <ActionPanel
                gs={gameState}
                myData={myData}
                myPublicState={myPublicState}
                isMyTurn={isMyTurn}
                isMyHermitTurn={isMyHermitTurn}
                isUnknown={isUnknown}
                validAttackTargets={validAttackTargets}
                players={players.map(p => ({ id: p.id, name: p.name }))}
                onRoll={rollMove}
                onChooseArea={chooseArea}
                onSkipArea={skipAreaAction}
                onUseArea={useAreaAction}
                onGiveHermit={giveHermitCard}
                onResolveHermit={resolveHermitCard}
                onAttack={attack}
                onSkipAttack={skipAttack}
                onReveal={revealCharacter}
                onUseSkill={activateSkill}
                onResolveSkill={resolveSkill}
              />
            </div>

            {/* Skill quick-use (outside of turn) */}
            {myData.characterId && !myData.usedSkill && (
              <div className="bg-gray-900/60 rounded-xl border border-violet-700/30 p-3">
                <button
                  onClick={() => setShowSkillDesc(v => !v)}
                  className="w-full text-left flex items-center justify-between mb-2 group"
                >
                  <p className="text-xs text-violet-300 font-semibold">✨ Skill: {getCharacterDef(myData.characterId)?.skillName}</p>
                  <span className="text-xs text-violet-500 group-hover:text-violet-300 transition-colors">{showSkillDesc ? '▲' : '▼'}</span>
                </button>
                {showSkillDesc && (
                  <p className="text-xs text-gray-300 bg-gray-800/60 rounded-lg px-3 py-2 mb-2 leading-relaxed border border-violet-700/20">
                    {getCharacterDef(myData.characterId)?.skillDescription}
                  </p>
                )}
                {/* Skills usable anytime after reveal */}
                {myPublicState?.revealed && getCharacterDef(myData.characterId)?.skillId === 'ALLIE_FULL_HEAL' && (
                  <Btn onClick={() => activateSkill()} className="w-full text-xs bg-green-800 hover:bg-green-700 border-green-600">
                    💚 Mother&apos;s Love
                  </Btn>
                )}
                {myPublicState?.revealed && getCharacterDef(myData.characterId)?.skillId === 'GREGOR_TEMPORARY_IMMUNITY' && (
                  <Btn onClick={() => activateSkill()} className="w-full text-xs bg-blue-800 hover:bg-blue-700 border-blue-600">
                    🏰 Barricade
                  </Btn>
                )}
                {myPublicState?.revealed && getCharacterDef(myData.characterId)?.skillId === 'WIGHT_EXTRA_TURNS' && isMyTurn && (
                  <Btn onClick={() => activateSkill()} className="w-full text-xs bg-red-900 hover:bg-red-800 border-red-700">
                    💀 Revenge
                  </Btn>
                )}
                {myPublicState?.revealed && getCharacterDef(myData.characterId)?.skillId === 'CATHERINE_HEAL_EACH_TURN' && isMyTurn && (
                  <Btn onClick={() => activateSkill()} className="w-full text-xs bg-green-800 hover:bg-green-700 border-green-600">
                    ✝️ Stigmata
                  </Btn>
                )}
                {/* Turn-start only skills: show note when not in ROLL phase */}
                {['FRANKLIN_D6_DAMAGE', 'GEORGE_D4_DAMAGE'].includes(getCharacterDef(myData.characterId)?.skillId ?? '') && !(isMyTurn && gameState.turnPhase === 'ROLL') && (
                  <p className="text-xs text-gray-500 italic text-center">Chỉ dùng được đầu lượt của bạn</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Players List */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">👥 Người Chơi</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {players.map(p => {
              const pub = gameState.players[p.id];
              if (!pub) return null;
              return (
                <PlayerRow
                  key={p.id}
                  p={pub}
                  myId={playerId}
                  isCurrentTurn={gameState.currentTurnPlayerId === p.id}
                  name={p.name}
                  canBeAttacked={
                    isMyTurn &&
                    (gameState.turnPhase === 'ATTACK' || gameState.turnPhase === 'ATTACK_TARGET') &&
                    validAttackTargets.includes(p.id)
                  }
                  onAttack={
                    isMyTurn && (gameState.turnPhase === 'ATTACK' || gameState.turnPhase === 'ATTACK_TARGET') && validAttackTargets.includes(p.id)
                      ? () => attack(p.id)
                      : undefined
                  }
                  onSelectForHermit={
                    isMyTurn && gameState.turnPhase === 'GIVE_HERMIT' && p.id !== playerId
                      ? () => giveHermitCard(p.id)
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>

        {/* Game Log */}
        <GameLog entries={gameState.log} />
      </div>
    </div>
  );
}
