'use client';

import { useCallback } from 'react';
import {
  doc,
  runTransaction,
  collection,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { getDb } from '@/services/firebase/config';
import { gameStorage } from '@/services/database/firebaseAdapter';
import type { Player } from '@/types/player';
import type { Room } from '@/types/room';
import type {
  SheriffGameState,
  SheriffPlayerData,
  LegalCategory,
  RoundLogEntry,
} from './types';
import {
  CARD_DEFS,
  LEGAL_GOODS,
  readPlayerData,
  createDeck,
  shuffleDeck,
  computeFinalScores,
  STARTING_GOLD,
  HAND_SIZE,
  DEFAULT_ROUNDS_BY_COUNT,
} from './constants';

// ─── State Reader ─────────────────────────────────────────────────────────────
export function readGameState(room: Room): SheriffGameState | null {
  const gs = room.gameState as unknown as SheriffGameState | undefined;
  return gs && gs.phase ? gs : null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSheriff(
  room: Room,
  players: Player[],
  playerId: string,
  isHost: boolean,
) {
  const roomId = room.id;
  const gameState = readGameState(room);
  const myPlayer = players.find((p) => p.id === playerId);
  const myData = readPlayerData(myPlayer);
  const isSheriff = gameState?.sheriffPlayerId === playerId;
  const merchants = players.filter((p) => p.id !== gameState?.sheriffPlayerId);

  // ─── Start Game ───────────────────────────────────────────────────────────
  const startGame = useCallback(
    async (totalRounds?: number) => {
      const count = players.length;
      const rounds = totalRounds ?? DEFAULT_ROUNDS_BY_COUNT[count] ?? 2;

      // Build & shuffle deck
      const deck = shuffleDeck(createDeck(true));
      let cursor = 0;

      // Sheriff order: randomize then deal cards to non-sheriffs
      const shuffledPlayers = shuffleDeck([...players]);
      const sheriffOrder = shuffledPlayers.map((p) => p.id);
      const sheriffPlayerId = sheriffOrder[0];
      const nonSheriff = shuffledPlayers.filter((p) => p.id !== sheriffPlayerId);

      // Build per-player hands
      const hands: Record<string, string[]> = {};
      for (const p of nonSheriff) {
        hands[p.id] = deck.slice(cursor, cursor + HAND_SIZE);
        cursor += HAND_SIZE;
      }
      const remainingDeck = deck.slice(cursor);

      const initialGameState: SheriffGameState = {
        phase: 'market',
        round: 1,
        totalRounds: rounds,
        sheriffOrder,
        sheriffPlayerId,
        drawPile: remainingDeck,
        discardPile: [],
        marketReady: {},
        bagSizes: {},
        bagConfirmed: {},
        declarations: {},
        declarationDone: {},
        inspectQueue: nonSheriff.map((p) => p.id),
        currentInspectTarget: null,
        inspectDecisions: {},
        bagRevealed: {},
        bagContents: {},
        bribeOffer: null,
        roundLog: [],
        finalScores: [],
        winner: null,
      };

      const db = getDb();
      const batch = writeBatch(db);

      // Update room status + gameState
      const roomRef = doc(db, 'rooms', roomId);
      batch.update(roomRef, {
        status: 'day',
        gameState: initialGameState,
      });

      // Update each merchant's hand + gold + clear market
      for (const p of nonSheriff) {
        const playerRef = doc(db, 'rooms', roomId, 'players', p.id);
        const playerData: Partial<SheriffPlayerData> = {
          hand: hands[p.id],
          bag: [],
          bagLocked: false,
          marketLegal: [],
          marketContraband: [],
          gold: STARTING_GOLD,
        };
        batch.update(playerRef, {
          'gameData.hand': playerData.hand,
          'gameData.bag': playerData.bag,
          'gameData.bagLocked': playerData.bagLocked,
          'gameData.marketLegal': playerData.marketLegal,
          'gameData.marketContraband': playerData.marketContraband,
          'gameData.gold': playerData.gold,
        });
      }

      // Sheriff also gets gold but no hand
      const sheriffRef = doc(db, 'rooms', roomId, 'players', sheriffPlayerId);
      batch.update(sheriffRef, {
        'gameData.hand': [],
        'gameData.bag': [],
        'gameData.bagLocked': false,
        'gameData.marketLegal': [],
        'gameData.marketContraband': [],
        'gameData.gold': STARTING_GOLD,
      });

      await batch.commit();
    },
    [players, roomId],
  );

  // ─── Start New Round ──────────────────────────────────────────────────────
  const startNewRound = useCallback(
    async (currentState: SheriffGameState) => {
      const nextRound = currentState.round + 1;
      const sheriffIdx = nextRound - 1; // 0-indexed
      const sheriffPlayerId =
        currentState.sheriffOrder[sheriffIdx % currentState.sheriffOrder.length];

      const nonSheriff = players.filter((p) => p.id !== sheriffPlayerId);

      // Deal from existing draw pile, replenish from discard if needed
      let pile = [...currentState.drawPile];
      const discard = [...currentState.discardPile];

      const totalNeeded = nonSheriff.length * HAND_SIZE;
      if (pile.length < totalNeeded) {
        // Reshuffle discard into draw pile
        pile = shuffleDeck([...pile, ...discard]);
      }

      let cursor = 0;
      const hands: Record<string, string[]> = {};
      for (const p of nonSheriff) {
        hands[p.id] = pile.slice(cursor, cursor + HAND_SIZE);
        cursor += HAND_SIZE;
      }
      const remainingDeck = pile.slice(cursor);

      const newState: SheriffGameState = {
        ...currentState,
        phase: 'market',
        round: nextRound,
        sheriffPlayerId,
        drawPile: remainingDeck,
        discardPile: [],
        marketReady: {},
        bagSizes: {},
        bagConfirmed: {},
        declarations: {},
        declarationDone: {},
        inspectQueue: nonSheriff.map((p) => p.id),
        currentInspectTarget: null,
        inspectDecisions: {},
        bagRevealed: {},
        bagContents: {},
        bribeOffer: null,
      };

      const db = getDb();
      const batch = writeBatch(db);

      const roomRef = doc(db, 'rooms', roomId);
      batch.update(roomRef, { gameState: newState });

      for (const p of nonSheriff) {
        const playerRef = doc(db, 'rooms', roomId, 'players', p.id);
        batch.update(playerRef, {
          'gameData.hand': hands[p.id],
          'gameData.bag': [],
          'gameData.bagLocked': false,
        });
      }

      // Sheriff clears their hand/bag
      const sheriffRef = doc(db, 'rooms', roomId, 'players', sheriffPlayerId);
      batch.update(sheriffRef, {
        'gameData.hand': [],
        'gameData.bag': [],
        'gameData.bagLocked': false,
      });

      await batch.commit();
    },
    [players, roomId],
  );

  // ─── Confirm Market ───────────────────────────────────────────────────────
  // Player selects which indices to swap out, gets new cards from draw pile
  const confirmMarket = useCallback(
    async (discardIndices: number[]) => {
      const db = getDb();
      const roomRef = doc(db, 'rooms', roomId);
      const playerRef = doc(db, 'rooms', roomId, 'players', playerId);

      await runTransaction(db, async (tx) => {
        const roomSnap = await tx.get(roomRef);
        const playerSnap = await tx.get(playerRef);
        const state = roomSnap.data()?.gameState as SheriffGameState;
        const pData = (playerSnap.data()?.gameData ?? {}) as Partial<SheriffPlayerData>;

        const currentHand = [...(pData.hand ?? [])];
        const toDiscard = discardIndices
          .sort((a, b) => b - a) // remove from end to preserve indices
          .map((i) => currentHand.splice(i, 1)[0])
          .filter(Boolean);

        const drawPile = [...state.drawPile];
        const drawn = drawPile.splice(0, toDiscard.length);
        const newHand = [...currentHand, ...drawn];
        const newDiscard = [...state.discardPile, ...toDiscard];

        tx.update(roomRef, {
          'gameState.drawPile': drawPile,
          'gameState.discardPile': newDiscard,
          [`gameState.marketReady.${playerId}`]: true,
        });
        tx.update(playerRef, { 'gameData.hand': newHand });
      });
    },
    [playerId, roomId],
  );

  // ─── Confirm Bag ─────────────────────────────────────────────────────────
  const confirmBag = useCallback(
    async (bagIndices: number[]) => {
      const currentHand = [...myData.hand];
      const bag: string[] = [];
      const remainingHand: string[] = [];

      currentHand.forEach((card, i) => {
        if (bagIndices.includes(i)) bag.push(card);
        else remainingHand.push(card);
      });

      await gameStorage.updatePlayerGameData(roomId, playerId, {
        bag,
        bagLocked: true,
        hand: remainingHand,
      } as Record<string, unknown>);

      await gameStorage.updateRoomGameState(roomId, {
        [`bagSizes.${playerId}`]: bag.length,
        [`bagConfirmed.${playerId}`]: true,
      } as Record<string, unknown>);
      // Phase advance is handled reactively by host's advanceBagPhase useEffect
    },
    [myData.hand, roomId, playerId],
  );

  // ─── Submit Declaration ───────────────────────────────────────────────────
  const submitDeclaration = useCallback(
    async (good: LegalCategory) => {
      const bagSize = myData.bag.length;
      await gameStorage.updateRoomGameState(roomId, {
        [`declarations.${playerId}`]: { good, count: bagSize },
        [`declarationDone.${playerId}`]: true,
      } as Record<string, unknown>);
      // Phase advance is handled reactively by host's advanceDeclarePhase useEffect
    },
    [myData.bag.length, roomId, playerId],
  );

  // ─── Bribery ──────────────────────────────────────────────────────────────
  const offerBribe = useCallback(
    async (gold: number) => {
      await gameStorage.updateRoomGameState(roomId, {
        bribeOffer: { fromPlayerId: playerId, gold, status: 'pending' },
      } as Record<string, unknown>);
    },
    [playerId, roomId],
  );

  const cancelBribe = useCallback(async () => {
    await gameStorage.updateRoomGameState(roomId, {
      bribeOffer: null,
    } as Record<string, unknown>);
  }, [roomId]);

  const respondToBribe = useCallback(
    async (accept: boolean) => {
      if (!gameState?.bribeOffer) return;
      const { fromPlayerId, gold } = gameState.bribeOffer;

      if (accept) {
        // Transfer gold: merchant → sheriff
        const merchantPlayer = players.find((p) => p.id === fromPlayerId);
        const merchantData = readPlayerData(merchantPlayer);
        const sheriffData = readPlayerData(players.find((p) => p.id === playerId));

        const db = getDb();
        const batch = writeBatch(db);
        const merchantRef = doc(db, 'rooms', roomId, 'players', fromPlayerId);
        const sheriffRef = doc(db, 'rooms', roomId, 'players', playerId);
        batch.update(merchantRef, { 'gameData.gold': Math.max(0, merchantData.gold - gold) });
        batch.update(sheriffRef, { 'gameData.gold': sheriffData.gold + gold });
        await batch.commit();
      }

      await gameStorage.updateRoomGameState(roomId, {
        bribeOffer: {
          ...gameState.bribeOffer,
          status: accept ? 'accepted' : 'rejected',
        },
      } as Record<string, unknown>);
    },
    [gameState, players, playerId, roomId],
  );

  // ─── Sheriff Decision ─────────────────────────────────────────────────────
  const decideSheriff = useCallback(
    async (decision: 'pass' | 'inspect') => {
      if (!gameState) return;
      const { currentInspectTarget, inspectQueue, declarations, bribeOffer, round } = gameState;
      if (!currentInspectTarget) return;

      const merchantPlayer = players.find((p) => p.id === currentInspectTarget);
      if (!merchantPlayer) return;
      const merchantData = readPlayerData(merchantPlayer);
      const bagContents = [...merchantData.bag];
      const declaration = declarations[currentInspectTarget];

      const db = getDb();
      const batch = writeBatch(db);
      const roomRef = doc(db, 'rooms', roomId);
      const merchantRef = doc(db, 'rooms', roomId, 'players', currentInspectTarget);
      const sheriffRef = doc(db, 'rooms', roomId, 'players', playerId);
      const sheriffData = readPlayerData(players.find((p) => p.id === playerId));

      let logEntry: RoundLogEntry;

      if (decision === 'pass') {
        // All bag contents go to merchant's market
        const legal: string[] = [];
        const contraband: string[] = [];
        for (const cat of bagContents) {
          const def = CARD_DEFS[cat as keyof typeof CARD_DEFS];
          if (def?.type === 'legal' || def?.type === 'royal') legal.push(cat);
          else contraband.push(cat);
        }

        const newMerchantLegal = [...merchantData.marketLegal, ...legal];
        const newMerchantContraband = [...merchantData.marketContraband, ...contraband];
        batch.update(merchantRef, {
          'gameData.bag': [],
          'gameData.bagLocked': false,
          'gameData.marketLegal': newMerchantLegal,
          'gameData.marketContraband': newMerchantContraband,
        });

        logEntry = {
          round,
          merchantId: currentInspectTarget,
          merchantName: merchantPlayer.name,
          declared: declaration ? `${declaration.count} ${declaration.good}` : '?',
          bagContents,
          wasHonest: checkHonesty(bagContents, declaration),
          wasInspected: false,
          goldChange: 0,
          ...(bribeOffer?.status === 'accepted' ? { bribeGold: bribeOffer.gold } : {}),
        };
      } else {
        // Inspect: check declaration
        const isHonest = checkHonesty(bagContents, declaration);

        if (isHonest) {
          // Merchant was honest → Sheriff pays compensation
          const compensation = bagContents.reduce((sum, cat) => {
            const def = CARD_DEFS[cat as keyof typeof CARD_DEFS];
            return sum + (def?.penalty ?? 0);
          }, 0);

          const legal: string[] = [];
          const contraband: string[] = [];
          for (const cat of bagContents) {
            const def = CARD_DEFS[cat as keyof typeof CARD_DEFS];
            if (def?.type === 'legal' || def?.type === 'royal') legal.push(cat);
            else contraband.push(cat);
          }

          batch.update(merchantRef, {
            'gameData.bag': [],
            'gameData.bagLocked': false,
            'gameData.marketLegal': [...merchantData.marketLegal, ...legal],
            'gameData.marketContraband': [...merchantData.marketContraband, ...contraband],
            'gameData.gold': merchantData.gold + compensation,
          });
          batch.update(sheriffRef, {
            'gameData.gold': Math.max(0, sheriffData.gold - compensation),
          });

          logEntry = {
            round,
            merchantId: currentInspectTarget,
            merchantName: merchantPlayer.name,
            declared: declaration ? `${declaration.count} ${declaration.good}` : '?',
            bagContents,
            wasHonest: true,
            wasInspected: true,
            goldChange: compensation,
          };
        } else {
          // Merchant lied → confiscate wrong goods, pay penalty
          const declaredGood = declaration?.good;
          const correctCards: string[] = [];
          const wrongCards: string[] = [];

          for (const cat of bagContents) {
            if (cat === declaredGood) correctCards.push(cat);
            else wrongCards.push(cat);
          }

          const penalty = wrongCards.reduce((sum, cat) => {
            const def = CARD_DEFS[cat as keyof typeof CARD_DEFS];
            return sum + (def?.penalty ?? 0);
          }, 0);

          const legal: string[] = [];
          const contraband: string[] = [];
          for (const cat of correctCards) {
            const def = CARD_DEFS[cat as keyof typeof CARD_DEFS];
            if (def?.type === 'legal' || def?.type === 'royal') legal.push(cat);
            else contraband.push(cat);
          }

          batch.update(merchantRef, {
            'gameData.bag': [],
            'gameData.bagLocked': false,
            'gameData.marketLegal': [...merchantData.marketLegal, ...legal],
            'gameData.marketContraband': [...merchantData.marketContraband, ...contraband],
            'gameData.gold': Math.max(0, merchantData.gold - penalty),
          });
          batch.update(sheriffRef, {
            'gameData.gold': sheriffData.gold + penalty,
          });

          // Confiscated wrong cards go to discard pile
          const newDiscardPile = [...gameState.discardPile, ...wrongCards];
          batch.update(roomRef, { 'gameState.discardPile': newDiscardPile });

          logEntry = {
            round,
            merchantId: currentInspectTarget,
            merchantName: merchantPlayer.name,
            declared: declaration ? `${declaration.count} ${declaration.good}` : '?',
            bagContents,
            wasHonest: false,
            wasInspected: true,
            goldChange: -penalty,
          };
        }
      }

      // Advance inspect queue
      const queueIdx = inspectQueue.indexOf(currentInspectTarget);
      const nextTarget = inspectQueue[queueIdx + 1] ?? null;

      // Strip undefined values from logEntry (Firestore rejects undefined fields)
      const cleanLog = JSON.parse(JSON.stringify(logEntry)) as typeof logEntry;

      batch.update(roomRef, {
        [`gameState.inspectDecisions.${currentInspectTarget}`]: decision,
        [`gameState.bagRevealed.${currentInspectTarget}`]: true,
        [`gameState.bagContents.${currentInspectTarget}`]: bagContents,
        'gameState.currentInspectTarget': nextTarget,
        'gameState.bribeOffer': null,
        'gameState.roundLog': [...(gameState.roundLog ?? []), cleanLog],
      });

      await batch.commit();

      // Sheriff (not necessarily host) advances to end_round when all done
      if (!nextTarget) {
        await gameStorage.updateRoomGameState(roomId, { phase: 'end_round' } as Record<string, unknown>);
      }
    },
    [gameState, players, playerId, roomId],
  );

  // ─── End Round / Final Scoring ─────────────────────────────────────────────
  const proceedAfterRound = useCallback(async () => {
    if (!gameState) return;
    const isLastRound = gameState.round >= gameState.totalRounds;

    if (isLastRound) {
      // Compute final scores
      const finalScores = computeFinalScores(players, gameState.sheriffPlayerId);
      const winner = finalScores[0]?.playerId ?? null;
      await gameStorage.updateRoomGameState(roomId, {
        phase: 'final_scoring',
        finalScores,
        winner,
      } as Record<string, unknown>);
      await gameStorage.updateRoomStatus(roomId, 'end');
    } else {
      await startNewRound(gameState);
    }
  }, [gameState, players, roomId, startNewRound]);

  // ─── Reset Game ───────────────────────────────────────────────────────────
  const resetGame = useCallback(async () => {
    const db = getDb();
    const playersSnap = await getDocs(collection(db, 'rooms', roomId, 'players'));
    const batch = writeBatch(db);
    playersSnap.docs.forEach((d) => {
      batch.update(d.ref, { gameData: {} });
    });
    const roomRef = doc(db, 'rooms', roomId);
    batch.update(roomRef, {
      status: 'lobby',
      gameState: {},
    });
    await batch.commit();
  }, [roomId]);

  // ─── Host: auto-advance market when all ready ─────────────────────────────
  const advanceMarketPhase = useCallback(async () => {
    if (!gameState || !isHost) return;
    const allReady = merchants.every((p) => gameState.marketReady?.[p.id]);
    if (allReady) {
      await gameStorage.updateRoomGameState(roomId, { phase: 'load_bag' } as Record<string, unknown>);
    }
  }, [gameState, isHost, merchants, roomId]);

  // ─── Host: advance declare when all confirmed bag ────────────────────────
  const advanceBagPhase = useCallback(async () => {
    if (!gameState || !isHost) return;
    const allConfirmed = merchants.every((p) => gameState.bagConfirmed?.[p.id]);
    if (allConfirmed) {
      await gameStorage.updateRoomGameState(roomId, { phase: 'declare' } as Record<string, unknown>);
    }
  }, [gameState, isHost, merchants, roomId]);

  // ─── Host: advance inspect when all merchants declared ───────────────────
  const advanceDeclarePhase = useCallback(async () => {
    if (!gameState || !isHost) return;
    const allDeclared = merchants.every((p) => gameState.declarationDone?.[p.id]);
    if (allDeclared && merchants.length > 0) {
      await gameStorage.updateRoomGameState(roomId, {
        phase: 'inspect',
        currentInspectTarget: gameState.inspectQueue?.[0] ?? null,
      } as Record<string, unknown>);
    }
  }, [gameState, isHost, merchants, roomId]);

  return {
    gameState,
    myData,
    isSheriff,
    merchants,
    // Actions
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
  };
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function checkHonesty(
  bagContents: string[],
  declaration: { good: string; count: number } | undefined,
): boolean {
  if (!declaration) return false;
  const validLegal = LEGAL_GOODS as readonly string[];
  if (!validLegal.includes(declaration.good)) return false;
  return bagContents.every((cat) => cat === declaration.good);
}
