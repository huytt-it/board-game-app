'use client';

import { useState } from 'react';
import { useNightActions } from '@/hooks/useNightActions';
import { useVoting } from '@/hooks/games/useVoting';
import { useGameHistory } from '@/hooks/useGameHistory';
import { gameStorage } from '@/services/database/firebaseAdapter';
import type { Player } from '@/types/player';
import type { GameAction } from '@/types/actions';
import { ROLE_ICONS, ROLE_NAMES_VI, ROLE_TEAMS, ClocktowerRole, type ClocktowerGameState } from '@/types/games/clocktower';
import VotingPanel from './VotingPanel';
import NightTimelinePanel from './NightTimelinePanel';
import GameHistoryPanel from './GameHistoryPanel';
import RoleHandbook from './RoleHandbook';

interface HostDashboardProps {
  roomId: string;
  hostId: string;
  players: Player[];
  onChangePhase: (phase: 'day' | 'night') => void;
  currentPhase: string;
  gameState?: ClocktowerGameState;
  onEndGame?: (winner: 'good' | 'evil') => void;
}

export default function HostDashboard({
  roomId,
  hostId,
  players,
  onChangePhase,
  currentPhase,
  gameState,
  onEndGame,
}: HostDashboardProps) {
  const { pendingActions, resolvedActions, resolveAction, sendPrivateMessage, clearAllActions } =
    useNightActions(roomId, hostId);
  const [resolveMessages, setResolveMessages] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'night' | 'history' | 'handbook'>('night');
  const [showHandbook, setShowHandbook] = useState(false);
  // Inline DM: which player card has the compose box open
  const [messagingPlayerId, setMessagingPlayerId] = useState<string | null>(null);
  const [inlineMessage, setInlineMessage] = useState('');

  const { events: historyEvents, addEvent } = useGameHistory(roomId);

  const dayCount = gameState?.dayCount ?? 0;
  const phase: 'night' | 'day' = currentPhase === 'night' ? 'night' : 'day';

  const alivePlayers = players.filter((p) => !p.isHost && p.isAlive).length;
  const {
    nominations, votingTarget, votingTargetName,
    votes, hasVoted, voteCount,
    nominatePlayer, castVote, resolveVote, cancelVote,
  } = useVoting(roomId, hostId, gameState, alivePlayers);

  // ─── Vote: majority → execute ─────────────────────────────────────────
  const handleVoteResolve = async () => {
    if (!votingTarget || !votingTargetName) return;
    const targetPlayer = players.find((p) => p.id === votingTarget);
    const executedRole = targetPlayer?.gameData?.role as string | undefined;
    const majority = Math.ceil(alivePlayers / 2);
    const executed = voteCount.agree >= majority;
    await resolveVote(executedRole);
    await addEvent({
      type: 'execution',
      dayCount,
      phase: 'day',
      emoji: executed ? '⚖️' : '🕊️',
      title: executed
        ? `${votingTargetName} bị xử tử`
        : `${votingTargetName} được tha bổng (không đủ phiếu)`,
      detail: `${voteCount.agree} đồng ý / ${voteCount.disagree} phản đối — cần ${majority} phiếu`,
      targetName: votingTargetName,
      targetRole: executedRole,
      resultState: executed ? 'executed' : 'pardoned',
    });
  };

  // ─── Vote: host cancels before resolution ─────────────────────────────
  const handleVoteCancel = async () => {
    if (!votingTargetName) return;
    await cancelVote();
    await addEvent({
      type: 'host_decision',
      dayCount,
      phase: 'day',
      emoji: '🚫',
      title: `Phiên toà cho ${votingTargetName} bị huỷ bởi Quản trò`,
      resultState: 'pardoned',
      targetName: votingTargetName,
    });
  };

  // ─── Toggle alive (manual kill / revive by host) ──────────────────────
  const toggleAlive = async (playerId: string, currentAlive: boolean) => {
    const player = players.find((p) => p.id === playerId);
    const role = player?.gameData?.role as ClocktowerRole | undefined;

    // ScarletWoman warning when Imp is killed
    if (currentAlive && role === ClocktowerRole.Imp) {
      const aliveCount = players.filter((p) => !p.isHost && p.isAlive).length;
      const scarletWoman = players.find(
        (p) => !p.isHost && p.isAlive && p.gameData?.role === ClocktowerRole.ScarletWoman
      );
      if (scarletWoman && aliveCount >= 5) {
        alert(
          `⚠️ SCARLET WOMAN!\n${scarletWoman.name} là Scarlet Woman và có ${aliveCount} người còn sống.\n` +
          `Scarlet Woman sẽ trở thành Imp mới! Cập nhật vai trò của họ trong Grimoire.`
        );
      }
    }

    await gameStorage.updatePlayerAlive(roomId, playerId, !currentAlive);

    if (currentAlive) {
      // Killed
      await addEvent({
        type: 'night_death',
        dayCount,
        phase,
        emoji: '💀',
        title: `${player?.name || playerId} đã chết`,
        detail: phase === 'night' ? 'Chết trong đêm (xử lý thủ công bởi Quản trò)' : 'Bị loại bởi Quản trò',
        targetName: player?.name,
        targetRole: role ? String(role) : undefined,
        resultState: 'killed',
      });
    } else {
      // Revived — host note only
      await addEvent({
        type: 'host_decision',
        dayCount,
        phase,
        emoji: '💖',
        title: `${player?.name || playerId} được hồi sinh (Quản trò)`,
        targetName: player?.name,
        targetRole: role ? String(role) : undefined,
        resultState: 'approved',
      });
    }
  };

  // ─── Night action: host resolves → approve / send info ───────────────
  const handleResolve = async (action: GameAction) => {
    const msg = resolveMessages[action.id] || '';
    const hasMessage = msg.trim().length > 0;

    // 1. Mark action resolved + send private message to player
    await resolveAction(action.id, hasMessage ? msg : 'Không có thông tin.');
    await sendPrivateMessage(action.playerId, hasMessage ? msg : 'Không có thông tin.');
    setResolveMessages((prev) => {
      const copy = { ...prev };
      delete copy[action.id];
      return copy;
    });

    const actor = players.find((p) => p.id === action.playerId);
    const actorRole = actor?.gameData?.role as ClocktowerRole | undefined;
    const targetPlayer = players.find((p) => p.id === action.targetId);
    const targetRole = targetPlayer?.gameData?.role as ClocktowerRole | undefined;
    const secondTargetPlayer = players.find((p) => p.id === action.secondTargetId);
    const secondTargetRole = secondTargetPlayer?.gameData?.role as ClocktowerRole | undefined;

    // 2. Auto-update isPoisoned when Poisoner resolves their action
    if (actorRole === ClocktowerRole.Poisoner && action.targetId) {
      // Clear previous victim
      const previousVictim = players.find(
        (p) => p.gameData?.isPoisoned === true && p.id !== action.targetId
      );
      if (previousVictim) {
        await gameStorage.updatePlayerGameData(roomId, previousVictim.id, { isPoisoned: false });
        await addEvent({
          type: 'state_change',
          dayCount,
          phase: 'night',
          emoji: '✅',
          title: `${previousVictim.name} hết nhiễm độc`,
          targetName: previousVictim.name,
          targetRole: previousVictim.gameData?.role as string | undefined,
          resultState: 'poison_cleared',
        });
      }
      await gameStorage.updatePlayerGameData(roomId, action.targetId, { isPoisoned: true });
      await addEvent({
        type: 'state_change',
        dayCount,
        phase: 'night',
        emoji: '☠️',
        title: `${action.targetName || '?'} bị nhiễm độc bởi Poisoner`,
        actorName: action.playerName,
        actorRole: String(ClocktowerRole.Poisoner),
        targetName: action.targetName,
        targetRole: targetRole ? String(targetRole) : undefined,
        resultState: 'poisoned',
      });
    }

    // 3. Monk protection — log state change
    if (actorRole === ClocktowerRole.Monk && action.targetId) {
      await addEvent({
        type: 'state_change',
        dayCount,
        phase: 'night',
        emoji: '🛡️',
        title: `${action.targetName || '?'} được Monk bảo vệ đêm nay`,
        actorName: action.playerName,
        actorRole: String(ClocktowerRole.Monk),
        targetName: action.targetName,
        targetRole: targetRole ? String(targetRole) : undefined,
        resultState: 'protected',
      });
    }

    // 4. Butler master assignment — log state change
    if (actorRole === ClocktowerRole.Butler && action.targetId) {
      await addEvent({
        type: 'state_change',
        dayCount,
        phase: 'night',
        emoji: '🎩',
        title: `${action.playerName} (Butler) chọn ${action.targetName || '?'} làm chủ nhân`,
        actorName: action.playerName,
        actorRole: String(ClocktowerRole.Butler),
        targetName: action.targetName,
        targetRole: targetRole ? String(targetRole) : undefined,
        resultState: 'master_assigned',
      });
    }

    // 5. Imp self-kill → Starpass mechanic
    if (actorRole === ClocktowerRole.Imp && action.targetId === action.playerId) {
      const aliveMinions = players.filter(
        (p) => !p.isHost && p.isAlive && ROLE_TEAMS[p.gameData?.role as ClocktowerRole] === 'minion'
      );
      if (aliveMinions.length > 0) {
        await gameStorage.updateRoomGameState(roomId, {
          pendingStarpassAction: {
            impPlayerId: action.playerId,
            impPlayerName: action.playerName,
            minions: aliveMinions.map((p) => ({
              id: p.id,
              name: p.name,
              role: String(p.gameData?.role ?? ''),
            })),
          },
        } as any);
        await addEvent({
          type: 'state_change',
          dayCount,
          phase: 'night',
          emoji: '🔁',
          title: `${action.playerName} (Imp) tự giết — Starpass!`,
          detail: `Đang chờ Quản trò chỉ định Minion trở thành Imp mới.`,
          actorName: action.playerName,
          actorRole: String(ClocktowerRole.Imp),
          resultState: 'approved',
        });
        return; // Don't fall through to main log — the starpass event is sufficient
      } else {
        // No minions alive → Imp simply dies
        await gameStorage.updatePlayerAlive(roomId, action.playerId, false);
        await addEvent({
          type: 'night_death',
          dayCount,
          phase: 'night',
          emoji: '💀',
          title: `${action.playerName} (Imp) tự giết — không có Minion, Imp chết!`,
          actorName: action.playerName,
          actorRole: String(ClocktowerRole.Imp),
          resultState: 'killed',
        });
        return;
      }
    }

    // 6. Log the main night action (approved by host)
    let title = `${action.playerName} (${actorRole || '?'}) sử dụng kỹ năng`;
    if (action.targetName) {
      title = `${action.playerName} (${actorRole || '?'}) → ${action.targetName}`;
      if (action.secondTargetName) title += ` & ${action.secondTargetName}`;
    }

    await addEvent({
      type: 'night_action',
      dayCount,
      phase: 'night',
      emoji: '🎯',
      title,
      actorName: action.playerName,
      actorRole: actorRole ? String(actorRole) : undefined,
      targetName: action.targetName,
      targetRole: targetRole ? String(targetRole) : undefined,
      secondTargetName: action.secondTargetName,
      secondTargetRole: secondTargetRole ? String(secondTargetRole) : undefined,
      messageSent: hasMessage ? msg : undefined,
      resultState: 'approved',
    });
  };

  // ─── Slayer: kill target ───────────────────────────────────────────────
  const handleSlayerKill = async () => {
    const slayer = gameState?.pendingSlayerAction;
    if (!slayer) return;
    const targetPlayer = players.find((p) => p.id === slayer.targetId);
    const targetRole = targetPlayer?.gameData?.role as ClocktowerRole | undefined;
    await gameStorage.updatePlayerAlive(roomId, slayer.targetId, false);
    await gameStorage.updateRoomGameState(roomId, { pendingSlayerAction: null } as any);
    await addEvent({
      type: 'ability_used',
      dayCount,
      phase: 'day',
      emoji: '⚔️',
      title: `${slayer.slayerName} (Slayer) hạ gục ${slayer.targetName} — TRÚNG QUỶDỮ!`,
      actorName: slayer.slayerName,
      actorRole: String(ClocktowerRole.Slayer),
      targetName: slayer.targetName,
      targetRole: targetRole ? String(targetRole) : undefined,
      resultState: 'killed',
    });
  };

  // ─── Slayer: miss ──────────────────────────────────────────────────────
  const handleSlayerMiss = async () => {
    const slayer = gameState?.pendingSlayerAction;
    if (!slayer) return;
    const targetPlayer = players.find((p) => p.id === slayer.targetId);
    const targetRole = targetPlayer?.gameData?.role as ClocktowerRole | undefined;
    await gameStorage.updateRoomGameState(roomId, { pendingSlayerAction: null } as any);
    await addEvent({
      type: 'ability_used',
      dayCount,
      phase: 'day',
      emoji: '⚔️',
      title: `${slayer.slayerName} (Slayer) hạ ${slayer.targetName} — TRẬT! Không ai chết.`,
      actorName: slayer.slayerName,
      actorRole: String(ClocktowerRole.Slayer),
      targetName: slayer.targetName,
      targetRole: targetRole ? String(targetRole) : undefined,
      resultState: 'miss',
    });
  };

  // ─── Starpass: host assigns a Minion as the new Imp ──────────────────
  const handleStarpassConfirm = async (minionId: string) => {
    const starpass = gameState?.pendingStarpassAction;
    if (!starpass) return;

    const minion = players.find((p) => p.id === minionId);
    const minionOldRole = minion?.gameData?.role as ClocktowerRole | undefined;

    // Promote the chosen Minion → Imp
    await gameStorage.updatePlayerGameData(roomId, minionId, { role: ClocktowerRole.Imp });
    // Kill the old Imp
    await gameStorage.updatePlayerAlive(roomId, starpass.impPlayerId, false);

    await addEvent({
      type: 'state_change',
      dayCount,
      phase: 'night',
      emoji: '👹',
      title: `${minion?.name ?? '?'} trở thành Imp mới! (Starpass)`,
      detail: `${starpass.impPlayerName} (Imp cũ) đã chết · ${minion?.name} chuyển từ ${minionOldRole ?? '?'} thành Imp`,
      actorName: starpass.impPlayerName,
      actorRole: String(ClocktowerRole.Imp),
      targetName: minion?.name,
      targetRole: minionOldRole ? String(minionOldRole) : undefined,
      resultState: 'approved',
    });

    await gameStorage.updateRoomGameState(roomId, { pendingStarpassAction: null } as any);
  };

  // ─── Inline direct private message ────────────────────────────────────
  const handleInlineMessage = async (targetId: string) => {
    const msg = inlineMessage.trim();
    if (!targetId || !msg) return;
    const targetPlayer = players.find((p) => p.id === targetId);
    await sendPrivateMessage(targetId, msg);
    await addEvent({
      type: 'host_decision',
      dayCount,
      phase,
      emoji: '📬',
      title: `Quản trò gửi tin riêng cho ${targetPlayer?.name || targetId}`,
      targetName: targetPlayer?.name,
      messageSent: msg,
    });
    setInlineMessage('');
    setMessagingPlayerId(null);
  };

  // ─── Start new night ───────────────────────────────────────────────────
  const handleNewNight = async () => {
    await addEvent({
      type: 'phase_change',
      dayCount: dayCount + 1,
      phase: 'night',
      emoji: '🌙',
      title: `Bắt đầu Đêm ${dayCount + 1}`,
    });
    await clearAllActions();
    onChangePhase('night');
  };

  // ─── Team visual tokens for Grimoire cards ───────────────────────────
  const TEAM_CARD: Record<string, {
    border: string; bg: string; glow: string; badge: string; text: string;
  }> = {
    townsfolk: {
      border: 'border-blue-500/35',   bg: 'bg-blue-900/25',
      glow:   'shadow-blue-500/10',   badge: 'bg-blue-500/20 text-blue-300',
      text: 'text-blue-300',
    },
    outsider: {
      border: 'border-purple-500/35', bg: 'bg-purple-900/25',
      glow:   'shadow-purple-500/10', badge: 'bg-purple-500/20 text-purple-300',
      text: 'text-purple-300',
    },
    minion: {
      border: 'border-orange-500/35', bg: 'bg-orange-900/25',
      glow:   'shadow-orange-500/10', badge: 'bg-orange-500/20 text-orange-300',
      text: 'text-orange-300',
    },
    demon: {
      border: 'border-red-500/40',    bg: 'bg-red-900/30',
      glow:   'shadow-red-500/10',    badge: 'bg-red-500/20 text-red-300',
      text: 'text-red-300',
    },
  };

  // ─── Team count stats ─────────────────────────────────────────────────
  const gamePlayers = players.filter((p) => !p.isHost);
  const teamStats = (['townsfolk', 'outsider', 'minion', 'demon'] as const).map((team) => {
    const all   = gamePlayers.filter((p) => ROLE_TEAMS[p.gameData?.role as ClocktowerRole] === team);
    const alive = all.filter((p) => p.isAlive);
    return { team, total: all.length, alive: alive.length };
  });
  const goodAlive = teamStats.filter((t) => t.team === 'townsfolk' || t.team === 'outsider').reduce((s, t) => s + t.alive, 0);
  const evilAlive = teamStats.filter((t) => t.team === 'minion'    || t.team === 'demon').reduce((s, t) => s + t.alive, 0);

  return (
    <div className="space-y-6">

      {/* ── Phase Controls ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Phase Control</h3>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => onChangePhase('day')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              currentPhase === 'day'
                ? 'bg-amber-500 text-black'
                : 'bg-white/5 text-slate-300 hover:bg-amber-500/20 hover:text-amber-300'
            }`}
            id="phase-day-btn"
          >
            ☀️ Day
          </button>
          <button
            onClick={handleNewNight}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              currentPhase === 'night'
                ? 'bg-indigo-500 text-white'
                : 'bg-white/5 text-slate-300 hover:bg-indigo-500/20 hover:text-indigo-300'
            }`}
            id="phase-night-btn"
          >
            🌙 Night
          </button>
        </div>
      </div>

      {/* ── Day / Voting section ───────────────────────────────────────── */}
      {(currentPhase === 'day' || currentPhase === 'voting') && (
        <div className="space-y-4">

          {/* Active voting panel */}
          {currentPhase === 'voting' && votingTarget && votingTargetName && (
            <VotingPanel
              targetName={votingTargetName}
              targetId={votingTarget}
              players={players}
              playerId={hostId}
              votes={votes}
              hasVoted={hasVoted}
              voteCount={voteCount}
              onVote={(v) => castVote(v)}
              onResolve={handleVoteResolve}
              onCancel={handleVoteCancel}
              isHost={true}
              alivePlayers={alivePlayers}
            />
          )}

          {/* Pending Slayer action — awaiting host decision */}
          {gameState?.pendingSlayerAction && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">⚔️</span>
                <h3 className="text-sm font-semibold text-amber-400">Kỹ năng Slayer — Chờ Quản trò quyết định</h3>
              </div>
              <p className="mb-1 text-xs text-slate-400">
                Người chơi đã công khai tuyên bố sử dụng kỹ năng Slayer. Quản trò kiểm tra và quyết định kết quả.
              </p>
              <div className="mb-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                <span className="font-bold text-white">{gameState.pendingSlayerAction.slayerName}</span>
                <span className="text-slate-400"> tuyên bố hạ </span>
                <span className="font-bold text-amber-300">{gameState.pendingSlayerAction.targetName}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSlayerKill}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-red-500"
                >
                  💀 Trúng — Mục tiêu là Quỷ, giết ngay
                </button>
                <button
                  onClick={handleSlayerMiss}
                  className="flex-1 rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-500"
                >
                  ✗ Trật — Không phải Quỷ, không ai chết
                </button>
              </div>
            </div>
          )}

          {/* Live Nominations — day only */}
          {currentPhase === 'day' && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-400">
                ⚖️ Đề cử đang diễn ra
              </h3>
              <div className="space-y-2">
                {players
                  .filter((p) => !p.isHost && p.isAlive)
                  .sort((a, b) => {
                    const aCount = Object.values(nominations || {}).filter((id) => id === a.id).length;
                    const bCount = Object.values(nominations || {}).filter((id) => id === b.id).length;
                    return bCount - aCount;
                  })
                  .map((p) => {
                    const role = p.gameData?.role as ClocktowerRole | undefined;
                    const count = Object.values(nominations || {}).filter((id) => id === p.id).length;
                    const percentage = alivePlayers > 0 ? Math.round((count / alivePlayers) * 100) : 0;
                    if (count === 0) return null;
                    return (
                      <div key={p.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 text-sm text-white font-medium">
                              {role && <span>{ROLE_ICONS[role]}</span>}
                              {p.name}
                              {role === ClocktowerRole.Virgin && (
                                <span className="rounded-full bg-pink-500/20 px-1.5 py-0.5 text-[10px] font-bold text-pink-300">
                                  👼 Virgin
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-amber-400 font-bold">
                              {count} đề cử ({percentage}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (role === ClocktowerRole.Virgin) {
                              alert(
                                `⚠️ VIRGIN!\n${p.name} là Virgin.\n` +
                                `Nếu người đề cử đầu tiên là Townsfolk, họ bị xử tử ngay lập tức (không cần bỏ phiếu).\n` +
                                `Hãy hỏi ai đã đề cử đầu tiên trước khi bắt đầu phiên toà.`
                              );
                            }
                            nominatePlayer(p.id, p.name);
                          }}
                          className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-amber-500 shadow-lg shadow-amber-500/20"
                        >
                          ⚖️ Xét xử
                        </button>
                      </div>
                    );
                  })}
                {Object.values(nominations || {}).filter(Boolean).length === 0 && (
                  <p className="text-sm text-slate-500 italic text-center py-4">
                    Chưa có ai bị đề cử.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Starpass — Imp tự giết, chọn Minion kế vị ───────────────── */}
      {gameState?.pendingStarpassAction && (
        <div className="rounded-xl border-2 border-orange-500/50 bg-gradient-to-br from-orange-950/60 to-red-950/40 p-4 shadow-lg shadow-orange-500/10 animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🔁</span>
            <div>
              <h3 className="text-base font-black text-orange-300">Starpass — Chọn Quỷ Mới!</h3>
              <p className="text-xs text-slate-400">
                <span className="font-bold text-orange-200">{gameState.pendingStarpassAction.impPlayerName}</span>
                {' '}(Imp) đã tự giết. Chọn Tay Sai trở thành Imp mới:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 mt-3">
            {gameState.pendingStarpassAction.minions.map((m) => {
              const roleEnum = m.role as ClocktowerRole;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    if (confirm(`Xác nhận: ${m.name} (${m.role}) trở thành Imp mới?\n${gameState!.pendingStarpassAction!.impPlayerName} sẽ bị đánh dấu chết.`)) {
                      handleStarpassConfirm(m.id);
                    }
                  }}
                  className="flex items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-left transition-all hover:bg-orange-500/20 hover:border-orange-500/50 active:scale-[0.98]"
                >
                  <span className="text-2xl shrink-0">
                    {ROLE_ICONS[roleEnum] ?? '🎭'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="block font-black text-white text-sm">{m.name}</span>
                    <span className="block text-xs text-orange-300">
                      {m.role} · {ROLE_NAMES_VI[roleEnum] ?? m.role}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-lg bg-orange-500/20 border border-orange-500/30 px-3 py-1.5 text-xs font-black text-orange-300">
                    👹 Chọn làm Imp
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-[11px] text-slate-500 text-center">
            ⚠️ Thao tác này sẽ cập nhật vai trò Firestore và đánh dấu Imp cũ là đã chết
          </p>
        </div>
      )}

      {/* ── Night actions / History / Handbook tabs ───────────────────── */}
      {showHandbook && <RoleHandbook onClose={() => setShowHandbook(false)} />}
      <div className="rounded-xl border border-white/10 bg-white/5">
        <div className="flex border-b border-white/10 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('night')}
            className={`shrink-0 flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'night'
                ? 'text-purple-400 border-b-2 border-purple-500'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            🌙 {currentPhase === 'night' ? 'Đêm' : 'Nhật ký'}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`shrink-0 flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'history'
                ? 'text-amber-400 border-b-2 border-amber-500'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            📜 Lịch sử ({historyEvents.filter((e) => e.type !== 'phase_change').length})
          </button>
          <button
            onClick={() => setShowHandbook(true)}
            className="shrink-0 flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors text-slate-500 hover:text-slate-300"
          >
            📖 Sách HD
          </button>
        </div>
        <div className="p-4">
          {activeTab === 'night' && currentPhase === 'night' && (
            <NightTimelinePanel
              players={players}
              pendingActions={pendingActions}
              resolvedActions={resolvedActions}
              dayCount={dayCount}
              gameState={gameState}
              resolveMessages={resolveMessages}
              onResolveMessageChange={(id, val) =>
                setResolveMessages((prev) => ({ ...prev, [id]: val }))
              }
              onResolve={handleResolve}
            />
          )}
          {activeTab === 'night' && currentPhase !== 'night' && (
            <p className="text-center text-sm text-slate-500 py-4">
              Đang ban ngày. Chuyển sang đêm để xem hành động.
            </p>
          )}
          {activeTab === 'history' && <GameHistoryPanel events={historyEvents} />}
        </div>
      </div>

      {/* ══ Grimoire + Sơ đồ chỗ ngồi (combined) ══════════════════════════ */}
      {(() => {
        // Sort players by seat number for consistent circular display
        const seated = gamePlayers
          .filter((p) => p.gameData?.seatNumber != null)
          .sort((a, b) => (a.gameData.seatNumber as number) - (b.gameData.seatNumber as number));
        // Players without seats appended at end
        const unseated = gamePlayers.filter((p) => p.gameData?.seatNumber == null);
        const ordered = [...seated, ...unseated];
        const n = seated.length;

        return (
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">

            {/* ── Header bar ────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 flex-wrap">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 shrink-0">
                🔮 Grimoire · 🪑 Sơ đồ vòng tròn
              </h3>
              <span className="text-xs text-slate-600 shrink-0">{gamePlayers.length} người chơi</span>
              <div className="ml-auto flex gap-2 flex-wrap">
                {/* Good pill */}
                <div className="flex items-center gap-1 rounded-xl border border-blue-500/25 bg-blue-900/20 px-2.5 py-1">
                  <span className="text-xs">☀️</span>
                  <span className="text-[11px] font-black text-blue-300">{goodAlive}</span>
                  <span className="text-[10px] text-slate-500">sống</span>
                  <span className="text-[10px] text-blue-400 font-bold ml-1">
                    🌟{teamStats.find(t=>t.team==='townsfolk')?.alive ?? 0}
                  </span>
                  <span className="text-[10px] text-purple-400 font-bold">
                    🌀{teamStats.find(t=>t.team==='outsider')?.alive ?? 0}
                  </span>
                </div>
                {/* Evil pill */}
                <div className="flex items-center gap-1 rounded-xl border border-red-500/25 bg-red-900/20 px-2.5 py-1">
                  <span className="text-xs">🌑</span>
                  <span className="text-[11px] font-black text-red-300">{evilAlive}</span>
                  <span className="text-[10px] text-slate-500">sống</span>
                  <span className="text-[10px] text-orange-400 font-bold ml-1">
                    🗡️{teamStats.find(t=>t.team==='minion')?.alive ?? 0}
                  </span>
                  <span className="text-[10px] text-red-400 font-bold">
                    👹{teamStats.find(t=>t.team==='demon')?.alive ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Player detail cards (sorted by seat) ──────────────────── */}
            <div className="divide-y divide-white/5">
              {ordered.map((p) => {
                const role       = p.gameData?.role as ClocktowerRole | undefined;
                const team       = role ? ROLE_TEAMS[role] : undefined;
                const tc         = team ? TEAM_CARD[team] : null;
                const isDrunk    = p.gameData?.isDrunk === true;
                const drunkRole  = p.gameData?.drunkRole as ClocktowerRole | undefined;
                const isPoisoned = p.gameData?.isPoisoned === true;
                const seat       = p.gameData?.seatNumber as number | undefined;
                const isMessaging = messagingPlayerId === p.id;

                // Circular neighbours (seated players only)
                const seatedIdx = seated.findIndex((s) => s.id === p.id);
                const leftN  = seatedIdx >= 0 ? seated[(seatedIdx - 1 + n) % n] : null;
                const rightN = seatedIdx >= 0 ? seated[(seatedIdx + 1) % n] : null;

                return (
                  <div key={p.id} className={`transition-all ${
                    !p.isAlive
                      ? 'bg-red-950/15 opacity-70'
                      : tc
                      ? tc.bg
                      : 'bg-white/[0.02]'
                  }`}>
                    {/* Main row */}
                    <div className="flex items-center gap-3 px-4 py-3">

                      {/* Seat badge + left-border accent */}
                      <div className={`flex flex-col items-center shrink-0 w-7 border-l-2 pl-1 ${
                        tc ? tc.border.replace('border-', 'border-l-').replace('/35','/60').replace('/40','/70') : 'border-l-white/10'
                      }`}>
                        {seat != null && (
                          <span className="text-[11px] font-black text-slate-500 leading-none">#{seat}</span>
                        )}
                      </div>

                      {/* Role icon */}
                      <span className={`text-2xl shrink-0 leading-none ${!p.isAlive ? 'grayscale opacity-40' : ''}`}>
                        {role ? ROLE_ICONS[role] : '🎭'}
                      </span>

                      {/* Name + role + status badges */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-sm font-black leading-tight ${!p.isAlive ? 'line-through text-slate-500' : 'text-white'}`}>
                            {p.name}
                          </span>
                          {!p.isAlive && <span className="text-[10px] text-red-400">💀</span>}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap mt-0.5">
                          {role && (
                            <span className={`text-[11px] font-bold ${tc ? tc.text : 'text-slate-400'}`}>
                              {String(role)}
                            </span>
                          )}
                          {isDrunk && drunkRole && (
                            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black text-amber-300">
                              🍺 {drunkRole}
                            </span>
                          )}
                          {isPoisoned && (
                            <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-black text-purple-300">
                              ☠️ Nhiễm độc
                            </span>
                          )}
                        </div>
                        {/* Neighbour hint */}
                        {leftN && rightN && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className={`text-[9px] font-semibold truncate max-w-[56px] ${leftN.isAlive ? 'text-slate-500' : 'text-slate-700 line-through'}`}>
                              ← {leftN.name}
                            </span>
                            <span className="text-[9px] text-slate-700 shrink-0">·</span>
                            <span className={`text-[9px] font-semibold truncate max-w-[56px] ${rightN.isAlive ? 'text-slate-500' : 'text-slate-700 line-through'}`}>
                              {rightN.name} →
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => { setMessagingPlayerId(isMessaging ? null : p.id); setInlineMessage(''); }}
                          className={`flex h-8 w-8 items-center justify-center rounded-xl border text-sm transition-all active:scale-95 ${
                            isMessaging
                              ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300'
                              : 'border-white/10 bg-white/5 text-slate-500 hover:text-cyan-400 hover:border-cyan-500/30'
                          }`}
                          title="Gửi tin riêng"
                        >
                          💬
                        </button>
                        <button
                          onClick={() => toggleAlive(p.id, p.isAlive)}
                          className={`flex h-8 w-8 items-center justify-center rounded-xl border text-sm transition-all active:scale-95 ${
                            p.isAlive
                              ? 'border-red-500/25 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                              : 'border-green-500/25 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          }`}
                          title={p.isAlive ? 'Giết' : 'Hồi sinh'}
                        >
                          {p.isAlive ? '💀' : '💖'}
                        </button>
                      </div>
                    </div>

                    {/* Inline DM compose */}
                    {isMessaging && (
                      <div className="border-t border-cyan-500/15 bg-cyan-950/20 px-4 py-2.5">
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-cyan-400 shrink-0">📬</span>
                          <input
                            type="text"
                            value={inlineMessage}
                            onChange={(e) => setInlineMessage(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleInlineMessage(p.id); }}
                            placeholder={`Tin nhắn riêng cho ${p.name}...`}
                            autoFocus
                            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500/50"
                          />
                          <button
                            onClick={() => handleInlineMessage(p.id)}
                            disabled={!inlineMessage.trim()}
                            className="shrink-0 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-cyan-500 disabled:opacity-40 active:scale-95"
                          >
                            Gửi
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── End Game ───────────────────────────────────────────────────── */}
      {onEndGame && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Kết thúc ván đấu
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                if (confirm('Xác nhận đội Thiện thắng?')) onEndGame('good');
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3 font-bold text-white transition-all hover:from-cyan-500 hover:to-blue-500"
            >
              🌟 Thiện thắng
            </button>
            <button
              onClick={() => {
                if (confirm('Xác nhận đội Ác thắng?')) onEndGame('evil');
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 px-4 py-3 font-bold text-white transition-all hover:from-red-500 hover:to-orange-500"
            >
              👹 Ác thắng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
