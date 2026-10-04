'use client';

import { useCallback, useMemo } from 'react';
import type { Room } from '@/types/room';
import type { Player } from '@/types/player';
import type { RoomGameState } from '@/types/room';
import { gameStorage } from '@/services/database/firebaseAdapter';
import type {
  SHGameState, SHPlayerData, SHPublicPlayerState,
  SHArea, SHFaction, SHTurnPhase, SHLogEntry, SHPendingEffect,
} from './types';
import {
  CHARACTERS, CHARACTER_MAP, PLAYER_DISTRIBUTION,
  buildInitialDecks, readGameState, readMyData, makeInitialPublicPlayer,
  rollDie, shuffle, getCardDef, getCharacterDef,
  AREA_GROUP, getAreaFromRoll,
  rollAttackDamage, applyAttackModifiers, getAttackTargets,
  DAVID_REQUIRED_EQUIPMENT,
} from './constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function gs$(base: SHGameState, patch: Partial<SHGameState>): SHGameState {
  return { ...base, ...patch } as SHGameState;
}

function addLog(gs: SHGameState, type: SHLogEntry['type'], msg: string): SHGameState {
  return gs$(gs, { log: [{ ts: Date.now(), type, msg }, ...gs.log].slice(0, 50) });
}

function healDamage(gs: SHGameState, playerId: string, amount: number): SHGameState {
  const p = gs.players[playerId];
  if (!p || !p.isAlive) return gs;
  const newDmg = Math.max(0, p.damage - amount);
  return gs$(gs, { players: { ...gs.players, [playerId]: { ...p, damage: newDmg } } });
}

function dealDamage(
  gs: SHGameState,
  targetId: string,
  amount: number,
  source?: string,
): SHGameState {
  const target = gs.players[targetId];
  if (!target || !target.isAlive) return gs;

  // immunity check
  if (target.immuneToAttack && source === 'ATTACK') return gs;

  // Talisman blocks specific card sources
  if (
    target.equipment.includes('WHITE_TALISMAN') &&
    ['TARGET_DAMAGE_2_SELF_DAMAGE_2', 'TARGET_DAMAGE_2_SELF_HEAL_1', 'ROLL_2D6_DAMAGE_AREA_3'].includes(source ?? '')
  ) {
    return gs;
  }

  // Fortune Brooch blocks Weird Woods
  if (target.equipment.includes('WHITE_FORTUNE_BROOCH') && source === 'WEIRD_WOODS') return gs;

  const newDmg = target.damage + Math.max(0, amount);
  const died = newDmg >= (target.maxHp ?? 999);

  const updated: SHPublicPlayerState = {
    ...target,
    damage: newDmg,
    isAlive: !died,
    ...(died ? { revealed: true } : {}),
  };

  let next = gs$(gs, { players: { ...gs.players, [targetId]: updated } });

  if (died) {
    next = addLog(next, 'DEATH', `💀 ${targetId} đã chết!`);
    next = handleDanielReveal(next);
  }

  return checkWinConditions(next);
}

function handleDanielReveal(gs: SHGameState): SHGameState {
  const danielEntry = Object.values(gs.players).find(p => {
    if (!p.revealed || !p.characterId) return false;
    return p.characterId === 'DANIEL';
  });
  // This runs after character is assigned; Daniel reveals when anyone dies
  // We mark daniel as revealed if not already (actual characterId is in private data)
  // Signal via extra flag stored in public state — handled client-side by each player
  return gs;
}

function checkWinConditions(gs: SHGameState): SHGameState {
  if (gs.turnPhase === 'GAME_OVER') return gs;

  const players = Object.values(gs.players);
  const aliveShadows = players.filter(p => p.isAlive && p.faction === 'SHADOW');
  const aliveHunters = players.filter(p => p.isAlive && p.faction === 'HUNTER');
  const deadNeutrals = players.filter(p => !p.isAlive && p.faction === 'NEUTRAL');

  const winners = new Set<string>();

  // Hunter win condition
  if (aliveShadows.length === 0) {
    players.filter(p => p.faction === 'HUNTER').forEach(p => winners.add(p.playerId));
  }
  // Shadow win condition
  if (aliveHunters.length === 0 || deadNeutrals.length >= 3) {
    players.filter(p => p.faction === 'SHADOW').forEach(p => winners.add(p.playerId));
  }

  // Neutral win conditions
  players.filter(p => p.faction === 'NEUTRAL').forEach(p => {
    if (checkNeutralWin(gs, p, players)) winners.add(p.playerId);
  });

  if (winners.size === 0) return gs;

  // Reveal all characters at game end
  const revealedAll: Record<string, string> = {};
  players.forEach(p => {
    if (p.characterId) revealedAll[p.playerId] = p.characterId;
  });

  return addLog(
    gs$(gs, { turnPhase: 'GAME_OVER', winnerIds: [...winners], revealedAll }),
    'WIN',
    `🏆 Game kết thúc! Người thắng: ${[...winners].join(', ')}`,
  );
}

function checkNeutralWin(
  gs: SHGameState,
  p: SHPublicPlayerState,
  allPlayers: SHPublicPlayerState[],
): boolean {
  const charId = p.characterId;
  if (!charId) return false;

  switch (charId) {
    case 'ALLIE':
      return gs.turnPhase === 'GAME_OVER' && p.isAlive;

    case 'BOB': {
      const count = Object.keys(gs.players).length;
      const threshold = count <= 6 ? 4 : 5;
      return p.equipment.length >= threshold;
    }

    case 'CHARLES':
      return !!(p as SHPublicPlayerState & { charlesKilled?: boolean }).charlesKilled;

    case 'DANIEL': {
      const deaths = allPlayers.filter(q => !q.isAlive);
      const isFirstDead = deaths.length >= 1 && deaths[0].playerId === p.playerId;
      const huntersWon = gs.winnerIds.some(id => {
        const pl = gs.players[id];
        return pl?.faction === 'HUNTER';
      });
      return isFirstDead || (p.isAlive && huntersWon);
    }

    case 'CATHERINE': {
      const deaths = allPlayers.filter(q => !q.isAlive);
      const isFirstDead = deaths.length >= 1 && deaths[0].playerId === p.playerId;
      const alivePlayers = allPlayers.filter(q => q.isAlive);
      const isLastTwo = alivePlayers.length <= 2 && p.isAlive;
      return isFirstDead || isLastTwo;
    }

    case 'BRYAN':
      return !!(p as SHPublicPlayerState & { bryanWon?: boolean }).bryanWon;

    case 'DAVID': {
      const count = DAVID_REQUIRED_EQUIPMENT.filter(id => p.equipment.includes(id)).length;
      return count >= 3;
    }

    case 'AGNES':
      return !!(p as SHPublicPlayerState & { agnesWon?: boolean }).agnesWon;

    default:
      return false;
  }
}

// ─── Bob equipment threshold ──────────────────────────────────────────────────
function bobThreshold(playerCount: number): number {
  return playerCount <= 6 ? 4 : 5;
}

// ─── Draw from deck (auto-reshuffle discard if empty) ─────────────────────────
function drawFromDeck(
  gs: SHGameState,
  deck: 'white' | 'black' | 'hermit',
): { gs: SHGameState; cardId: string | null } {
  let deckArr = [...gs.decks[deck]];
  let discardArr = [...gs.discards[deck]];

  if (deckArr.length === 0) {
    if (discardArr.length === 0) return { gs, cardId: null };
    deckArr = shuffle(discardArr);
    discardArr = [];
  }

  const cardId = deckArr.pop()!;
  return {
    gs: {
      ...gs,
      decks: { ...gs.decks, [deck]: deckArr },
      discards: { ...gs.discards, [deck]: discardArr },
    },
    cardId,
  };
}

function discardCard(gs: SHGameState, cardId: string, deck: 'white' | 'black' | 'hermit'): SHGameState {
  return {
    ...gs,
    discards: { ...gs.discards, [deck]: [...gs.discards[deck], cardId] },
  };
}

// ─── Apply single-use card effect (no target required) ────────────────────────
function applyInstantCardEffect(
  gs: SHGameState,
  playerId: string,
  cardId: string,
  faction: SHFaction,
  characterId: string,
): SHGameState {
  const card = getCardDef(cardId);
  if (!card) return gs;

  switch (card.effectId) {
    case 'SELF_HEAL_2':
      return healDamage(gs, playerId, 2);

    case 'HUNTER_FULL_HEAL':
      if (faction === 'HUNTER') {
        const p = gs.players[playerId];
        if (p) return { ...gs, players: { ...gs.players, [playerId]: { ...p, damage: 0, revealed: true } } };
      }
      return gs;

    case 'SHADOW_FULL_HEAL':
      if (faction === 'SHADOW') {
        const p = gs.players[playerId];
        if (p) return { ...gs, players: { ...gs.players, [playerId]: { ...p, damage: 0, revealed: true } } };
      }
      return gs;

    case 'NAME_GROUP_FULL_HEAL_A_E_U': {
      const char = getCharacterDef(characterId);
      if (char && ['A', 'E', 'U'].includes(char.name[0].toUpperCase())) {
        const p = gs.players[playerId];
        if (p) return { ...gs, players: { ...gs.players, [playerId]: { ...p, damage: 0, revealed: true } } };
      }
      return gs;
    }

    case 'IMMUNE_TO_ATTACK_UNTIL_NEXT_TURN': {
      const p = gs.players[playerId];
      if (p) return { ...gs, players: { ...gs.players, [playerId]: { ...p, immuneToAttack: true } } };
      return gs;
    }

    case 'GAIN_EXTRA_TURN': {
      const p = gs.players[playerId];
      if (p) return { ...gs, players: { ...gs.players, [playerId]: { ...p, extraTurnCount: (p.extraTurnCount || 0) + 1 } } };
      return gs;
    }

    default:
      return gs;
  }
}

// ─── Apply hermit card effect ─────────────────────────────────────────────────
function applyHermitEffect(
  gs: SHGameState,
  receiverId: string,
  giverId: string,
  cardId: string,
  receiverFaction: SHFaction,
  characterId: string,
  lie: boolean,
): SHGameState {
  const card = getCardDef(cardId);
  if (!card) return gs;

  if (lie) {
    // Unknown: they lied, nothing really happens (or they can fake damage)
    return addLog(gs, 'CARD', `📜 Hermit Card: "Không có gì xảy ra"`);
  }

  const receiver = gs.players[receiverId];
  if (!receiver) return gs;

  function giveEquipOrDamage(factions: SHFaction[]): SHGameState {
    if (!factions.includes(receiverFaction)) return gs;
    const eq = receiver.equipment;
    if (eq.length === 0) {
      return dealDamage(gs, receiverId, 1, cardId);
    }
    // Auto-give first equipment to giver
    const [toGive, ...rest] = eq;
    const giver = gs.players[giverId];
    if (!giver) return gs;
    return {
      ...gs,
      players: {
        ...gs.players,
        [receiverId]: { ...receiver, equipment: rest },
        [giverId]: { ...giver, equipment: [...giver.equipment, toGive] },
      },
    };
  }

  switch (card.effectId) {
    case 'IF_HUNTER_HEAL_1_ELSE_IF_FULL_DAMAGE_1':
      if (receiverFaction === 'HUNTER') {
        if (receiver.damage > 0) return healDamage(gs, receiverId, 1);
        return gs;
      }
      if (receiver.damage === 0) return dealDamage(gs, receiverId, 1, cardId);
      return gs;

    case 'IF_SHADOW_HEAL_1_ELSE_IF_FULL_DAMAGE_1':
      if (receiverFaction === 'SHADOW') {
        if (receiver.damage > 0) return healDamage(gs, receiverId, 1);
        return gs;
      }
      if (receiver.damage === 0) return dealDamage(gs, receiverId, 1, cardId);
      return gs;

    case 'IF_NEUTRAL_HEAL_1_ELSE_IF_FULL_DAMAGE_1':
      if (receiverFaction === 'NEUTRAL') {
        if (receiver.damage > 0) return healDamage(gs, receiverId, 1);
        return gs;
      }
      if (receiver.damage === 0) return dealDamage(gs, receiverId, 1, cardId);
      return gs;

    case 'IF_HUNTER_OR_SHADOW_GIVE_EQUIPMENT_OR_DAMAGE_1':
      return giveEquipOrDamage(['HUNTER', 'SHADOW']);

    case 'IF_HUNTER_OR_NEUTRAL_GIVE_EQUIPMENT_OR_DAMAGE_1':
      return giveEquipOrDamage(['HUNTER', 'NEUTRAL']);

    case 'IF_NEUTRAL_OR_SHADOW_GIVE_EQUIPMENT_OR_DAMAGE_1':
      return giveEquipOrDamage(['NEUTRAL', 'SHADOW']);

    case 'IF_SHADOW_DAMAGE_2':
      if (receiverFaction === 'SHADOW') return dealDamage(gs, receiverId, 2, cardId);
      return gs;

    case 'IF_HUNTER_DAMAGE_1':
      if (receiverFaction === 'HUNTER') return dealDamage(gs, receiverId, 1, cardId);
      return gs;

    case 'IF_SHADOW_DAMAGE_1':
      if (receiverFaction === 'SHADOW') return dealDamage(gs, receiverId, 1, cardId);
      return gs;

    case 'IF_LOW_HP_NAME_GROUP_DAMAGE_1': {
      const char = getCharacterDef(characterId);
      if (char && ['A', 'B', 'C', 'E', 'U'].includes(char.name[0].toUpperCase())) {
        return dealDamage(gs, receiverId, 1, cardId);
      }
      return gs;
    }

    case 'IF_HIGH_HP_NAME_GROUP_DAMAGE_2': {
      const char = getCharacterDef(characterId);
      if (char && ['D', 'F', 'G', 'V', 'W'].includes(char.name[0].toUpperCase())) {
        return dealDamage(gs, receiverId, 2, cardId);
      }
      return gs;
    }

    case 'SHOW_CHARACTER_TO_CARD_OWNER':
      // Handled via private message sent to giver; nothing in public state
      return addLog(gs, 'CARD', `🔮 ${receiverId} cho ${giverId} xem nhân vật của mình.`);

    default:
      return gs;
  }
}

// ─── Next turn ────────────────────────────────────────────────────────────────
function advanceTurn(gs: SHGameState): SHGameState {
  const current = gs.players[gs.currentTurnPlayerId];
  if (!current) return gs;

  const cleared = gs$(gs, {
    players: { ...gs.players, [gs.currentTurnPlayerId]: { ...current, immuneToAttack: false } },
    lastRoll: null,
    pendingEffect: null,
    pendingHermit: null,
  });

  if ((current.extraTurnCount ?? 0) > 0) {
    return gs$(cleared, {
      turnPhase: 'ROLL',
      players: {
        ...cleared.players,
        [gs.currentTurnPlayerId]: {
          ...cleared.players[gs.currentTurnPlayerId],
          extraTurnCount: (current.extraTurnCount ?? 1) - 1,
        },
      },
    });
  }

  const alive = cleared.turnOrder.filter(id => cleared.players[id]?.isAlive);
  if (alive.length === 0) return cleared;

  const idx = alive.indexOf(gs.currentTurnPlayerId);
  const nextId = alive[(idx + 1) % alive.length];

  return gs$(cleared, { currentTurnPlayerId: nextId, turnPhase: 'ROLL' });
}

// ─── Main hook ────────────────────────────────────────────────────────────────
export function readSHGameState(room: Room): SHGameState | null {
  return readGameState(room);
}

// Remove all `undefined` values recursively so Firebase never rejects the payload.
function deepClean<T>(val: T): T {
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(deepClean) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
    if (v !== undefined) out[k] = deepClean(v);
  }
  return out as T;
}

export function useShadowHunter(
  room: Room,
  players: Player[],
  playerId: string,
  isHost: boolean,
) {
  const gameState = useMemo(() => readGameState(room), [room]);
  const myPlayer = useMemo(() => players.find(p => p.id === playerId), [players, playerId]);
  const myData = useMemo(() => readMyData(myPlayer), [myPlayer]);
  const myPublicState = useMemo(
    () => gameState?.players[playerId] ?? null,
    [gameState, playerId],
  );
  const isMyTurn = useMemo(
    () => gameState?.currentTurnPlayerId === playerId,
    [gameState, playerId],
  );
  const playerCount = players.length;

  // ── Write helpers ────────────────────────────────────────────────────────────
  const writeGS = useCallback(
    async (gs: SHGameState) => {
      await gameStorage.updateRoomGameState(room.id, deepClean(gs) as unknown as Partial<RoomGameState>);
    },
    [room.id],
  );

  const writeMyData = useCallback(
    async (data: Partial<SHPlayerData>) => {
      await gameStorage.updatePlayerGameData(room.id, playerId, data);
    },
    [room.id, playerId],
  );

  // ── startGame ────────────────────────────────────────────────────────────────
  const startGame = useCallback(async () => {
    if (!isHost) return;

    const dist = PLAYER_DISTRIBUTION[playerCount];
    if (!dist) return;

    // Pick characters
    const hunters = shuffle(CHARACTERS.filter(c => c.faction === 'HUNTER' && !c.expansion)).slice(0, dist.hunters);
    const shadows = shuffle(CHARACTERS.filter(c => c.faction === 'SHADOW' && !c.expansion)).slice(0, dist.shadows);
    const neutrals = shuffle(CHARACTERS.filter(c => c.faction === 'NEUTRAL' && !c.expansion)).slice(0, dist.neutrals);
    const picked = shuffle([...hunters, ...shadows, ...neutrals]);

    const turnOrder = players.map(p => p.id);
    const decks = buildInitialDecks();

    const publicPlayers: Record<string, SHPublicPlayerState> = {};
    players.forEach((p, i) => {
      const char = picked[i];
      publicPlayers[p.id] = {
        ...makeInitialPublicPlayer(p.id),
        faction: char.faction,
        maxHp: char.hp,
      };
    });

    // Initial game state (faction/maxHp are in public state for display purposes;
    // actual secret info written privately below)
    const gs: SHGameState = {
      turnPhase: 'ROLL',
      currentTurnPlayerId: turnOrder[0],
      turnOrder,
      decks,
      discards: { white: [], black: [], hermit: [] },
      players: publicPlayers,
      lastRoll: null,
      pendingHermit: null,
      pendingEffect: null,
      winnerIds: [],
      revealedAll: {},
      log: [{ ts: Date.now(), type: 'SYSTEM', msg: '🎮 Game Shadow Hunters bắt đầu!' }],
    };

    await writeGS(gs);

    // Write private character to each player
    for (let i = 0; i < players.length; i++) {
      const char = picked[i];
      await gameStorage.updatePlayerGameData(room.id, players[i].id, {
        characterId: char.id,
        faction: char.faction,
        maxHp: char.hp,
        usedSkill: false,
      } as SHPlayerData);
    }

    await gameStorage.updateRoomStatus(room.id, 'day');
  }, [isHost, players, playerCount, room.id, writeGS]);

  // ── rollMove ─────────────────────────────────────────────────────────────────
  const rollMove = useCallback(async () => {
    if (!gameState || !isMyTurn || gameState.turnPhase !== 'ROLL') return;

    const hasMysticCompass = myPublicState?.equipment.includes('WHITE_MYSTIC_COMPASS');
    const rolls = hasMysticCompass
      ? [{ d4: rollDie(4), d6: rollDie(6) }, { d4: rollDie(4), d6: rollDie(6) }]
      : [{ d4: rollDie(4), d6: rollDie(6) }];

    // Use best roll if Mystic Compass (client chooses, default: first)
    const { d4, d6 } = rolls[0];
    const total = d4 + d6;

    if (total === 7) {
      await writeGS(addLog({
        ...gameState,
        lastRoll: { d4, d6, total },
        turnPhase: 'CHOOSE_AREA',
      }, 'ACTION', `🎲 ${playerId} roll ${d4}+${d6}=7 — chọn khu vực!`));
      return;
    }

    const area = getAreaFromRoll(total) as SHArea;
    const current = gameState.players[playerId];

    // Re-roll if same area
    if (current?.area === area) {
      return rollMove();
    }

    const updatedPlayer = { ...current, area };
    let next: SHGameState = {
      ...gameState,
      lastRoll: { d4, d6, total },
      turnPhase: 'AREA_ACTION',
      players: { ...gameState.players, [playerId]: updatedPlayer },
    };

    // Check Masamune force-attack
    const hasMasamune = myPublicState?.equipment.includes('BLACK_MASAMUNE');
    const targets = getAttackTargets(playerId, next.players);
    if (hasMasamune && targets.length > 0) {
      // Force attack — skip area action and go straight to ATTACK_TARGET
      next = addLog({ ...next, turnPhase: 'ATTACK_TARGET' }, 'ACTION', `⚔️ Masamune bắt buộc attack!`);
    }

    await writeGS(addLog(next, 'ACTION', `🎲 ${playerId} di chuyển đến ${area} (${d4}+${d6}=${total})`));
  }, [gameState, isMyTurn, myPublicState, playerId, writeGS]);

  // ── chooseArea ───────────────────────────────────────────────────────────────
  const chooseArea = useCallback(async (area: SHArea) => {
    if (!gameState || !isMyTurn) return;
    if (gameState.turnPhase !== 'CHOOSE_AREA') return;

    const current = gameState.players[playerId];
    if (current?.area === area) return; // can't stay

    const updatedPlayer = { ...current, area };
    await writeGS(addLog({
      ...gameState,
      turnPhase: 'AREA_ACTION',
      players: { ...gameState.players, [playerId]: updatedPlayer },
    }, 'ACTION', `📍 ${playerId} chọn khu vực ${area}`));
  }, [gameState, isMyTurn, playerId, writeGS]);

  // ── skipAreaAction ───────────────────────────────────────────────────────────
  const skipAreaAction = useCallback(async () => {
    if (!gameState || !isMyTurn || gameState.turnPhase !== 'AREA_ACTION') return;
    const hasMasamune = myPublicState?.equipment.includes('BLACK_MASAMUNE');
    const targets = getAttackTargets(playerId, gameState.players);
    const nextPhase: SHTurnPhase = (hasMasamune && targets.length > 0) ? 'ATTACK_TARGET' : 'ATTACK';
    await writeGS({ ...gameState, turnPhase: nextPhase });
  }, [gameState, isMyTurn, myPublicState, playerId, writeGS]);

  // ── useAreaAction ────────────────────────────────────────────────────────────
  const useAreaAction = useCallback(async (
    opts?: { targetPlayerId?: string; deckChoice?: 'white' | 'black' | 'hermit'; weirdWoodsAction?: 'DAMAGE' | 'HEAL'; stealCardId?: string }
  ) => {
    if (!gameState || !isMyTurn || gameState.turnPhase !== 'AREA_ACTION') return;

    const area = gameState.players[playerId]?.area;
    if (!area) return;

    let gs = gameState;

    switch (area) {
      case 'CHURCH': {
        const { gs: gs2, cardId } = drawFromDeck(gs, 'white');
        if (!cardId) return;
        gs = gs2;
        const card = getCardDef(cardId);
        if (!card) return;
        if (card.subtype === 'EQUIPMENT') {
          gs = addLog({
            ...gs,
            players: { ...gs.players, [playerId]: { ...gs.players[playerId], equipment: [...gs.players[playerId].equipment, cardId] } },
          }, 'CARD', `📦 ${playerId} trang bị ${card.nameVI}`);
        } else if (['TARGET_HEAL_D6', 'SET_TARGET_DAMAGE_TO_7', 'DAMAGE_ALL_OTHERS_2', 'FORCE_REVEAL_NAME_GROUP_V_W', 'TARGET_DAMAGE_2_SELF_DAMAGE_2', 'TARGET_DAMAGE_2_SELF_HEAL_1', 'STEAL_ONE_EQUIPMENT', 'GIVE_EQUIPMENT_OR_SELF_DAMAGE_1', 'ROLL_D6_TARGET_OR_SELF_DAMAGE_3'].includes(card.effectId)) {
          // Needs target selection
          gs = discardCard(gs, cardId, 'white');
          gs = addLog({ ...gs, turnPhase: 'CARD_RESOLVE', pendingEffect: { type: 'CARD', actorPlayerId: playerId, cardId } }, 'CARD', `🃏 ${playerId} rút ${card.nameVI} — chọn mục tiêu`);
          await writeGS(gs);
          return;
        } else {
          gs = discardCard(applyInstantCardEffect(gs, playerId, cardId, myData.faction, myData.characterId), cardId, 'white');
          gs = addLog(gs, 'CARD', `🃏 ${playerId} dùng ${card.nameVI}`);
        }
        break;
      }

      case 'CEMETERY': {
        const { gs: gs2, cardId } = drawFromDeck(gs, 'black');
        if (!cardId) return;
        gs = gs2;
        const card = getCardDef(cardId);
        if (!card) return;
        if (card.subtype === 'EQUIPMENT') {
          gs = addLog({
            ...gs,
            players: { ...gs.players, [playerId]: { ...gs.players[playerId], equipment: [...gs.players[playerId].equipment, cardId] } },
          }, 'CARD', `📦 ${playerId} trang bị ${card.nameVI}`);
        } else if (['TARGET_DAMAGE_2_SELF_DAMAGE_2', 'TARGET_DAMAGE_2_SELF_HEAL_1', 'STEAL_ONE_EQUIPMENT', 'GIVE_EQUIPMENT_OR_SELF_DAMAGE_1', 'ROLL_D6_TARGET_OR_SELF_DAMAGE_3'].includes(card.effectId)) {
          gs = discardCard(gs, cardId, 'black');
          gs = addLog({ ...gs, turnPhase: 'CARD_RESOLVE', pendingEffect: { type: 'CARD', actorPlayerId: playerId, cardId } }, 'CARD', `🃏 ${playerId} rút ${card.nameVI} — chọn mục tiêu`);
          await writeGS(gs);
          return;
        } else {
          gs = discardCard(applyInstantCardEffect(gs, playerId, cardId, myData.faction, myData.characterId), cardId, 'black');
          gs = addLog(gs, 'CARD', `🃏 ${playerId} dùng ${card.nameVI}`);
          // Handle ROLL_2D6_DAMAGE_AREA_3 (Dynamite)
          if (card.effectId === 'ROLL_2D6_DAMAGE_AREA_3') {
            gs = resolveDynamite(gs);
          }
        }
        break;
      }

      case 'UNDERWORLD_GATE': {
        const deck = opts?.deckChoice ?? 'white';
        const { gs: gs2, cardId } = drawFromDeck(gs, deck);
        if (!cardId) return;
        gs = gs2;
        const card = getCardDef(cardId);
        if (!card) return;
        if (card.subtype === 'EQUIPMENT') {
          gs = addLog({
            ...gs,
            players: { ...gs.players, [playerId]: { ...gs.players[playerId], equipment: [...gs.players[playerId].equipment, cardId] } },
          }, 'CARD', `📦 ${playerId} trang bị ${card.nameVI}`);
        } else {
          gs = discardCard(applyInstantCardEffect(gs, playerId, cardId, myData.faction, myData.characterId), cardId, deck);
          gs = addLog(gs, 'CARD', `🃏 ${playerId} dùng ${card.nameVI}`);
        }
        break;
      }

      case 'HERMIT_CABIN': {
        const { gs: gs2, cardId } = drawFromDeck(gs, 'hermit');
        if (!cardId) return;
        gs = { ...gs2, turnPhase: 'GIVE_HERMIT' };
        gs = addLog(gs, 'CARD', `📜 ${playerId} rút Hermit Card — đang chọn người nhận...`);
        await writeGS(gs);
        // Write hermit card to giver's private state
        await writeMyData({ drawnHermitCardId: cardId });
        return;
      }

      case 'WEIRD_WOODS': {
        if (!opts?.targetPlayerId) {
          // Ask for target first — only include weirdWoodsChoice if it's already set
          const pendingEff: SHPendingEffect = { type: 'AREA_WEIRD_WOODS', actorPlayerId: playerId };
          if (opts?.weirdWoodsAction) pendingEff.weirdWoodsChoice = opts.weirdWoodsAction;
          gs = { ...gs, turnPhase: 'CARD_RESOLVE', pendingEffect: pendingEff };
          await writeGS(gs);
          return;
        }
        const tgt = opts.targetPlayerId;
        const action = opts.weirdWoodsAction ?? 'DAMAGE';
        if (action === 'DAMAGE') {
          gs = dealDamage(gs, tgt, 2, 'WEIRD_WOODS');
          gs = addLog(gs, 'DAMAGE', `🌲 Weird Woods: ${playerId} gây 2 damage cho ${tgt}`);
        } else {
          gs = healDamage(gs, tgt, 1);
          gs = addLog(gs, 'HEAL', `🌲 Weird Woods: ${playerId} hồi 1 damage cho ${tgt}`);
        }
        break;
      }

      case 'ERSTWHILE_ALTAR': {
        if (!opts?.targetPlayerId) {
          gs = { ...gs, turnPhase: 'CARD_RESOLVE', pendingEffect: { type: 'AREA_ALTAR', actorPlayerId: playerId } };
          await writeGS(gs);
          return;
        }
        const tgt = opts.targetPlayerId;
        const stealCardId = opts?.stealCardId ?? gameState.players[tgt]?.equipment[0];
        if (stealCardId) {
          const tgtPlayer = gs.players[tgt];
          const me = gs.players[playerId];
          if (tgtPlayer && me) {
            gs = {
              ...gs,
              players: {
                ...gs.players,
                [tgt]: { ...tgtPlayer, equipment: tgtPlayer.equipment.filter(e => e !== stealCardId) },
                [playerId]: { ...me, equipment: [...me.equipment, stealCardId] },
              },
            };
            gs = addLog(gs, 'ACTION', `🗿 ${playerId} cướp ${stealCardId} từ ${tgt}`);
          }
        }
        break;
      }
    }

    // After area action, move to ATTACK
    gs = checkWinConditions(gs);
    if (gs.turnPhase !== 'GAME_OVER') {
      const hasMasamune = myPublicState?.equipment.includes('BLACK_MASAMUNE');
      const targets = getAttackTargets(playerId, gs.players);
      gs = { ...gs, turnPhase: (hasMasamune && targets.length > 0) ? 'ATTACK_TARGET' : 'ATTACK' };
    }

    await writeGS(gs);
  }, [gameState, isMyTurn, myData, myPublicState, playerId, writeGS, writeMyData]);

  // ── giveHermitCard ───────────────────────────────────────────────────────────
  const giveHermitCard = useCallback(async (targetPlayerId: string) => {
    if (!gameState || !isMyTurn || gameState.turnPhase !== 'GIVE_HERMIT') return;
    const cardId = myData.drawnHermitCardId;
    if (!cardId) return;

    // Write card to target's private data
    await gameStorage.updatePlayerGameData(room.id, targetPlayerId, {
      pendingHermitCardId: cardId,
    });

    // Update public state: who is receiving the hermit card
    await writeGS(addLog({
      ...gameState,
      turnPhase: 'RESOLVE_HERMIT',
      pendingHermit: { cardId, giverPlayerId: playerId, receiverPlayerId: targetPlayerId },
    }, 'CARD', `📜 ${playerId} đưa Hermit Card cho ${targetPlayerId}`));

    // Clear from giver's private state (use '' instead of undefined — Firebase rejects undefined)
    await writeMyData({ drawnHermitCardId: '' });
  }, [gameState, isMyTurn, myData, playerId, room.id, writeGS, writeMyData]);

  // ── resolveHermitCard ────────────────────────────────────────────────────────
  const resolveHermitCard = useCallback(async (lie = false) => {
    if (!gameState || gameState.turnPhase !== 'RESOLVE_HERMIT') return;
    if (!gameState.pendingHermit) return;
    if (gameState.pendingHermit.receiverPlayerId !== playerId) return;

    const { cardId, giverPlayerId } = gameState.pendingHermit;

    // Prediction: send private message to giver
    const card = getCardDef(cardId);
    if (card?.effectId === 'SHOW_CHARACTER_TO_CARD_OWNER') {
      await gameStorage.sendPrivateMessage(
        room.id,
        giverPlayerId,
        `🔮 Prediction: ${players.find(p => p.id === playerId)?.name ?? playerId} là nhân vật ${getCharacterDef(myData.characterId)?.name ?? myData.characterId}`,
      );
    }

    let gs = applyHermitEffect(
      gameState,
      playerId,
      giverPlayerId,
      cardId,
      myData.faction,
      myData.characterId,
      lie,
    );
    gs = discardCard(gs, cardId, 'hermit');
    gs = checkWinConditions(gs);

    if (gs.turnPhase !== 'GAME_OVER') {
      const hasMasamune = myPublicState?.equipment.includes('BLACK_MASAMUNE');
      const targets = getAttackTargets(gameState.currentTurnPlayerId, gs.players);
      gs = { ...gs, turnPhase: (hasMasamune && targets.length > 0) ? 'ATTACK_TARGET' : 'ATTACK', pendingHermit: null };
    }

    await writeGS(gs);
    await writeMyData({ pendingHermitCardId: '' });
  }, [gameState, myData, myPublicState, playerId, players, room.id, writeGS, writeMyData]);

  // ── resolveCardEffect (with target) ─────────────────────────────────────────
  const resolveCardEffect = useCallback(async (targetPlayerId?: string, equipCardId?: string, weirdWoodsAction?: 'DAMAGE' | 'HEAL') => {
    if (!gameState || !isMyTurn) return;
    const eff = gameState.pendingEffect;
    if (!eff) return;

    const cardId = eff.cardId!;
    const card = getCardDef(cardId);
    if (!card && eff.type !== 'AREA_WEIRD_WOODS' && eff.type !== 'AREA_ALTAR') return;

    let gs: SHGameState = gs$(gameState, { pendingEffect: null, turnPhase: 'ATTACK' as SHTurnPhase });

    switch (eff.type) {
      case 'AREA_WEIRD_WOODS':
        if (targetPlayerId) {
          const action = weirdWoodsAction ?? eff.weirdWoodsChoice ?? 'DAMAGE';
          if (action === 'DAMAGE') {
            gs = dealDamage(gs, targetPlayerId, 2, 'WEIRD_WOODS');
          } else {
            gs = healDamage(gs, targetPlayerId, 1);
          }
        }
        break;

      case 'AREA_ALTAR':
        if (targetPlayerId && equipCardId) {
          const tgtP = gs.players[targetPlayerId];
          const me = gs.players[playerId];
          if (tgtP && me) {
            gs = {
              ...gs,
              players: {
                ...gs.players,
                [targetPlayerId]: { ...tgtP, equipment: tgtP.equipment.filter(e => e !== equipCardId) },
                [playerId]: { ...me, equipment: [...me.equipment, equipCardId] },
              },
            };
          }
        }
        break;

      case 'CARD':
        if (!card) break;
        switch (card.effectId) {
          case 'TARGET_HEAL_D6':
            if (targetPlayerId) gs = healDamage(gs, targetPlayerId, rollDie(6));
            break;
          case 'SET_TARGET_DAMAGE_TO_7':
            if (targetPlayerId) {
              const tgtP = gs.players[targetPlayerId];
              if (tgtP) gs = { ...gs, players: { ...gs.players, [targetPlayerId]: { ...tgtP, damage: 7 } } };
            }
            break;
          case 'DAMAGE_ALL_OTHERS_2':
            Object.keys(gs.players).forEach(id => {
              if (id !== playerId) gs = dealDamage(gs, id, 2, card.effectId);
            });
            break;
          case 'TARGET_DAMAGE_2_SELF_DAMAGE_2':
            if (targetPlayerId) {
              gs = dealDamage(gs, targetPlayerId, 2, card.effectId);
              gs = dealDamage(gs, playerId, 2, card.effectId);
            }
            break;
          case 'TARGET_DAMAGE_2_SELF_HEAL_1':
            if (targetPlayerId) {
              gs = dealDamage(gs, targetPlayerId, 2, card.effectId);
              gs = healDamage(gs, playerId, 1);
            }
            break;
          case 'FORCE_REVEAL_NAME_GROUP_V_W':
            if (targetPlayerId) {
              const tgtP = gs.players[targetPlayerId];
              const charId = tgtP?.characterId;
              const charDef = charId ? getCharacterDef(charId) : undefined;
              if (charDef && ['V', 'W'].includes(charDef.name[0].toUpperCase())) {
                gs = { ...gs, players: { ...gs.players, [targetPlayerId]: { ...tgtP!, revealed: true } } };
              }
            }
            break;
          case 'STEAL_ONE_EQUIPMENT':
            if (targetPlayerId && equipCardId) {
              const tgtP = gs.players[targetPlayerId];
              const me = gs.players[playerId];
              if (tgtP && me) {
                gs = {
                  ...gs,
                  players: {
                    ...gs.players,
                    [targetPlayerId]: { ...tgtP, equipment: tgtP.equipment.filter(e => e !== equipCardId) },
                    [playerId]: { ...me, equipment: [...me.equipment, equipCardId] },
                  },
                };
              }
            }
            break;
          case 'GIVE_EQUIPMENT_OR_SELF_DAMAGE_1': {
            const me = gs.players[playerId];
            if (me && me.equipment.length === 0) {
              gs = dealDamage(gs, playerId, 1, card.effectId);
            } else if (me && targetPlayerId && equipCardId) {
              gs = {
                ...gs,
                players: {
                  ...gs.players,
                  [playerId]: { ...me, equipment: me.equipment.filter(e => e !== equipCardId) },
                  [targetPlayerId]: { ...gs.players[targetPlayerId], equipment: [...(gs.players[targetPlayerId]?.equipment ?? []), equipCardId] },
                },
              };
            }
            break;
          }
          case 'ROLL_D6_TARGET_OR_SELF_DAMAGE_3': {
            if (!targetPlayerId) break;
            const r = rollDie(6);
            if (r <= 4) gs = dealDamage(gs, targetPlayerId, 3, card.effectId);
            else gs = dealDamage(gs, playerId, 3, card.effectId);
            break;
          }
          default:
            break;
        }
        break;

      default:
        break;
    }

    gs = checkWinConditions(gs);
    if (gs.turnPhase !== 'GAME_OVER') {
      const hasMasamune = myPublicState?.equipment.includes('BLACK_MASAMUNE');
      const targets = getAttackTargets(playerId, gs.players);
      gs = { ...gs, turnPhase: (hasMasamune && targets.length > 0) ? 'ATTACK_TARGET' : 'ATTACK' };
    }

    await writeGS(gs);
  }, [gameState, isMyTurn, myPublicState, playerId, writeGS]);

  // ── attack ───────────────────────────────────────────────────────────────────
  const attack = useCallback(async (targetPlayerId: string) => {
    if (!gameState || !isMyTurn) return;
    if (gameState.turnPhase !== 'ATTACK' && gameState.turnPhase !== 'ATTACK_TARGET') return;

    const attacker = gameState.players[playerId];
    const target = gameState.players[targetPlayerId];
    if (!attacker || !target || !target.isAlive) return;

    const charDef = myData.characterId ? getCharacterDef(myData.characterId) : undefined;
    const { d4, d6, damage: baseDmg } = rollAttackDamage(attacker, charDef);
    const damage = applyAttackModifiers(attacker, target, baseDmg);

    let gs = addLog(gameState, 'ACTION', `⚔️ ${playerId} → ${targetPlayerId}: roll ${d4}/${d6}, damage ${damage}`);
    gs = { ...gs, lastRoll: { d4, d6, total: d4 + d6 } };

    if (damage === 0) {
      gs = addLog(gs, 'ACTION', `💨 Miss!`);
    } else {
      // Machine Gun: hit all in range with same damage
      const hasMachineGun = attacker.equipment.includes('BLACK_MACHINE_GUN');
      if (hasMachineGun) {
        const targets = getAttackTargets(playerId, gs.players);
        for (const tid of targets) {
          gs = dealDamage(gs, tid, damage, 'ATTACK');
        }
      } else {
        const prevHp = target.maxHp ?? 0;
        const prevDmg = target.damage;
        gs = dealDamage(gs, targetPlayerId, damage, 'ATTACK');
        const afterTarget = gs.players[targetPlayerId];
        const killed = !afterTarget?.isAlive;

        // Silver Rosary: loot on kill
        if (killed && attacker.equipment.includes('WHITE_SILVER_ROSARY')) {
          const loot = [...(target.equipment ?? [])];
          const me = gs.players[playerId];
          if (me) gs = { ...gs, players: { ...gs.players, [playerId]: { ...me, equipment: [...me.equipment, ...loot] } } };
          gs = { ...gs, players: { ...gs.players, [targetPlayerId]: { ...(gs.players[targetPlayerId] ?? target), equipment: [] } } };
        }

        // Bryan: reveal if killed small HP char
        if (killed && myData.characterId === 'BRYAN') {
          const tgtChar = getCharacterDef(target.characterId ?? '');
          if (tgtChar && tgtChar.hp <= 12) {
            const me = gs.players[playerId];
            if (me) gs = gs$(gs, { players: { ...gs.players, [playerId]: { ...me, revealed: true } } });
          }
          // Bryan win check (high HP kill)
          if (tgtChar && tgtChar.hp >= 13) {
            const me = gs.players[playerId];
            if (me) gs = gs$(gs, { players: { ...gs.players, [playerId]: { ...me, bryanWon: true } } });
          }
        }

        // Vampire: heal 2 on successful attack
        if (myData.characterId === 'VAMPIRE' && attacker.revealed) {
          gs = healDamage(gs, playerId, 2);
        }

        // Charles: flag for double attack
        if (myData.characterId === 'CHARLES' && attacker.revealed && !killed) {
          // Charles can choose to take 2 damage to attack again — set pending
          gs = { ...gs, pendingEffect: { type: 'WEREWOLF_COUNTER', actorPlayerId: playerId, attackerPlayerId: targetPlayerId } };
        }
      }

      // Werewolf counter-attack opportunity
      const targetChar = getCharacterDef(target.characterId ?? '');
      const targetAfter = gs.players[targetPlayerId];
      if (targetChar?.skillId === 'WEREWOLF_COUNTERATTACK' && target.revealed && targetAfter?.isAlive) {
        gs = {
          ...gs,
          turnPhase: 'SKILL_RESOLVE',
          pendingEffect: { type: 'WEREWOLF_COUNTER', actorPlayerId: targetPlayerId, attackerPlayerId: playerId },
        };
        await writeGS(gs);
        return;
      }
    }

    gs = checkWinConditions(gs);
    if (gs.turnPhase !== 'GAME_OVER' && gs.turnPhase !== 'SKILL_RESOLVE') {
      gs = advanceTurn(gs);
    }

    await writeGS(gs);
  }, [gameState, isMyTurn, myData, playerId, writeGS]);

  // ── skipAttack ───────────────────────────────────────────────────────────────
  const skipAttack = useCallback(async () => {
    if (!gameState || !isMyTurn || gameState.turnPhase !== 'ATTACK') return;
    await writeGS(advanceTurn(gameState));
  }, [gameState, isMyTurn, writeGS]);

  // ── resolveSkill (Werewolf counter, Charles double attack) ───────────────────
  const resolveSkill = useCallback(async (accept: boolean) => {
    if (!gameState || gameState.turnPhase !== 'SKILL_RESOLVE') return;
    const eff = gameState.pendingEffect;
    if (!eff) return;

    if (eff.actorPlayerId !== playerId) return;

    let gs: SHGameState = gs$(gameState, { pendingEffect: null });

    if (eff.type === 'WEREWOLF_COUNTER' && accept && eff.attackerPlayerId) {
      // Counter-attack
      const targetId = eff.attackerPlayerId;
      const attacker = gs.players[playerId];
      const charDef = getCharacterDef(myData.characterId);
      const { d4, d6, damage: base } = rollAttackDamage(attacker, charDef);
      const dmg = applyAttackModifiers(attacker, gs.players[targetId], base);
      gs = dealDamage(gs, targetId, dmg, 'ATTACK');
      gs = addLog(gs, 'ACTION', `🐺 Werewolf phản công ${targetId}: ${dmg} damage`);
    }

    gs = checkWinConditions(gs);
    if (gs.turnPhase !== 'GAME_OVER') gs = advanceTurn(gs);
    await writeGS(gs);
  }, [gameState, myData, playerId, writeGS]);

  // ── revealCharacter ──────────────────────────────────────────────────────────
  const revealCharacter = useCallback(async () => {
    if (!gameState || !myData.characterId) return;
    const p = gameState.players[playerId];
    if (!p || p.revealed) return;

    // Daniel cannot self-reveal
    if (myData.characterId === 'DANIEL') return;

    await writeGS(addLog({
      ...gameState,
      players: {
        ...gameState.players,
        [playerId]: {
          ...p,
          revealed: true,
          characterId: myData.characterId,
          faction: myData.faction,
          maxHp: myData.maxHp,
        },
      },
    }, 'REVEAL', `👁️ ${playerId} reveal: ${myData.characterId}`));
  }, [gameState, myData, playerId, writeGS]);

  // ── useSkill ─────────────────────────────────────────────────────────────────
  const useSkill = useCallback(async (opts?: { targetPlayerId?: string }) => {
    if (!gameState || !myData.characterId || myData.usedSkill) return;
    const charDef = getCharacterDef(myData.characterId);
    if (!charDef) return;

    let gs = gameState;
    const me = gs.players[playerId];
    if (!me) return;

    // Most skills require reveal — bake the reveal directly into gs
    // so the final writeGS doesn't overwrite revealed: true
    if (!me.revealed && charDef.skillId !== 'UNKNOWN_LIE_HERMIT') {
      gs = addLog({
        ...gs,
        players: {
          ...gs.players,
          [playerId]: {
            ...me,
            revealed: true,
            characterId: myData.characterId,
            faction: myData.faction,
            maxHp: myData.maxHp,
          },
        },
      }, 'REVEAL', `👁️ ${playerId} reveal: ${myData.characterId}`);
    }

    switch (charDef.skillId) {
      case 'ALLIE_FULL_HEAL':
        gs = { ...gs, players: { ...gs.players, [playerId]: { ...me, damage: 0 } } };
        gs = addLog(gs, 'SKILL', `💚 Allie hồi toàn bộ máu`);
        break;

      case 'FRANKLIN_D6_DAMAGE': {
        if (!opts?.targetPlayerId) return;
        const dmg = rollDie(6);
        gs = dealDamage(gs, opts.targetPlayerId, dmg, 'SKILL');
        gs = addLog(gs, 'SKILL', `⚡ Franklin Lightning: ${dmg} damage cho ${opts.targetPlayerId}`);
        break;
      }

      case 'GEORGE_D4_DAMAGE': {
        if (!opts?.targetPlayerId) return;
        const dmg = rollDie(4);
        gs = dealDamage(gs, opts.targetPlayerId, dmg, 'SKILL');
        gs = addLog(gs, 'SKILL', `🛡️ George Demolish: ${dmg} damage cho ${opts.targetPlayerId}`);
        break;
      }

      case 'ELLEN_DISABLE_SKILL': {
        if (!opts?.targetPlayerId) return;
        const tgt = gs.players[opts.targetPlayerId];
        if (tgt) {
          gs = { ...gs, players: { ...gs.players, [opts.targetPlayerId]: { ...tgt, usedSkill: true } } };
        }
        gs = addLog(gs, 'SKILL', `🔒 Ellen niêm phong skill của ${opts.targetPlayerId}`);
        break;
      }

      case 'FUKA_SET_DAMAGE_NEXT_TURN': {
        if (!opts?.targetPlayerId) return;
        const tgt = gs.players[opts.targetPlayerId];
        if (tgt) gs = { ...gs, players: { ...gs.players, [opts.targetPlayerId]: { ...tgt, fukaTargetNextTurn: true } } };
        gs = addLog(gs, 'SKILL', `💉 Fu-ka: ${opts.targetPlayerId} sẽ có damage = 7 đầu lượt tới`);
        break;
      }

      case 'GREGOR_TEMPORARY_IMMUNITY':
        gs = { ...gs, players: { ...gs.players, [playerId]: { ...me, immuneToAttack: true } } };
        gs = addLog(gs, 'SKILL', `🏰 Gregor: miễn damage đến đầu lượt tiếp theo`);
        break;

      case 'DAVID_TAKE_DEAD_EQUIPMENT': {
        if (!opts?.targetPlayerId) return;
        const deadPlayer = gs.players[opts.targetPlayerId];
        if (!deadPlayer || deadPlayer.isAlive || deadPlayer.equipment.length === 0) return;
        const [stolen, ...rest] = deadPlayer.equipment;
        gs = {
          ...gs,
          players: {
            ...gs.players,
            [opts.targetPlayerId]: { ...deadPlayer, equipment: rest },
            [playerId]: { ...me, equipment: [...me.equipment, stolen] },
          },
        };
        gs = addLog(gs, 'SKILL', `⚰️ David lấy ${stolen} từ ${opts.targetPlayerId}`);
        break;
      }

      case 'WIGHT_EXTRA_TURNS': {
        const deaths = Object.values(gs.players).filter(p => !p.isAlive).length;
        gs = { ...gs, players: { ...gs.players, [playerId]: { ...me, extraTurnCount: (me.extraTurnCount ?? 0) + deaths } } };
        gs = addLog(gs, 'SKILL', `💀 Wight nhận thêm ${deaths} lượt`);
        break;
      }

      case 'ULTRA_SOUL_DAMAGE_UNDERWORLD': {
        const targets = Object.values(gs.players).filter(p => p.area === 'UNDERWORLD_GATE' && p.isAlive && p.playerId !== playerId);
        if (targets.length === 0) { gs = addLog(gs, 'SKILL', `👻 Ultra Soul: không có ai ở Underworld Gate`); break; }
        if (!opts?.targetPlayerId) return;
        gs = dealDamage(gs, opts.targetPlayerId, 3, 'SKILL');
        gs = addLog(gs, 'SKILL', `👻 Ultra Soul: 3 damage cho ${opts.targetPlayerId}`);
        break;
      }

      case 'CATHERINE_HEAL_EACH_TURN':
        gs = healDamage(gs, playerId, 1);
        gs = addLog(gs, 'SKILL', `✝️ Catherine hồi 1 máu`);
        break;

      default:
        return;
    }

    gs = checkWinConditions(gs);
    await writeGS(gs);
    await writeMyData({ usedSkill: true });
  }, [gameState, myData, playerId, revealCharacter, writeGS, writeMyData]);

  // ── resetGame ────────────────────────────────────────────────────────────────
  const resetGame = useCallback(async () => {
    if (!isHost) return;
    await gameStorage.clearGameData(room.id);
    await gameStorage.updateRoomStatus(room.id, 'lobby');
    for (const p of players) {
      await gameStorage.updatePlayerGameData(room.id, p.id, {});
    }
  }, [isHost, players, room.id]);

  // ── Computed ─────────────────────────────────────────────────────────────────
  const validAttackTargets = useMemo(() => {
    if (!gameState) return [];
    return getAttackTargets(playerId, gameState.players);
  }, [gameState, playerId]);

  const isMyHermitTurn = useMemo(
    () => gameState?.turnPhase === 'RESOLVE_HERMIT' && gameState.pendingHermit?.receiverPlayerId === playerId,
    [gameState, playerId],
  );

  const isUnknown = useMemo(() => myData.characterId === 'UNKNOWN', [myData.characterId]);

  return {
    gameState,
    myData,
    myPublicState,
    isMyTurn,
    isMyHermitTurn,
    isUnknown,
    validAttackTargets,
    playerCount,
    // Actions
    startGame,
    rollMove,
    chooseArea,
    skipAreaAction,
    useAreaAction,
    giveHermitCard,
    resolveHermitCard,
    resolveCardEffect,
    attack,
    skipAttack,
    resolveSkill,
    revealCharacter,
    useSkill,
    resetGame,
  };
}

// ─── Dynamite helper (called internally) ─────────────────────────────────────
function resolveDynamite(gs: SHGameState): SHGameState {
  const d1 = rollDie(6);
  const d2 = rollDie(6);
  const total = d1 + d2;
  if (total === 7) return addLog(gs, 'CARD', `💣 Dynamite: tổng 7 — không có gì!`);

  const area = getAreaFromRoll(total);
  if (!area) return gs;

  let next = gs;
  Object.values(gs.players).forEach(p => {
    if (p.area === area && p.isAlive) {
      const hasTalisman = p.equipment.includes('WHITE_TALISMAN');
      if (!hasTalisman) next = dealDamage(next, p.playerId, 3, 'ROLL_2D6_DAMAGE_AREA_3');
    }
  });

  return addLog(next, 'CARD', `💣 Dynamite nổ ở ${area}! (${d1}+${d2}=${total})`);
}
