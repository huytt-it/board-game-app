2. Core entities
type GameStatus =
  | "LOBBY"
  | "IN_PROGRESS"
  | "FINISHED";

type Faction =
  | "HUNTER"
  | "SHADOW"
  | "NEUTRAL";

type CardType =
  | "WHITE"
  | "BLACK"
  | "HERMIT";

type Area =
  | "HERMIT_CABIN"
  | "UNDERWORLD_GATE"
  | "CHURCH"
  | "CEMETERY"
  | "WEIRD_WOODS"
  | "ERSTWHILE_ALTAR";
3. Database schema
users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT now()
);
rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  host_user_id UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'LOBBY',
  max_players INT NOT NULL DEFAULT 8,
  created_at TIMESTAMP DEFAULT now()
);
room_players
CREATE TABLE room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  user_id UUID REFERENCES users(id),
  seat_order INT NOT NULL,
  is_ready BOOLEAN DEFAULT false,
  is_alive BOOLEAN DEFAULT true,
  character_id TEXT,
  damage INT DEFAULT 0,
  area TEXT,
  revealed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);
game_events
CREATE TABLE game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
4. In-memory game state

Trong lúc game đang chạy, nên lưu state trong Redis hoặc memory server.

type GameState = {
  roomId: string;
  status: "LOBBY" | "IN_PROGRESS" | "FINISHED";

  players: PlayerState[];

  currentTurnPlayerId: string;

  decks: {
    white: Card[];
    black: Card[];
    hermit: Card[];
  };

  discard: {
    white: Card[];
    black: Card[];
    hermit: Card[];
  };

  winnerPlayerIds: string[];

  turnPhase:
    | "MOVE"
    | "AREA_ACTION"
    | "ATTACK"
    | "END";
};
5. Player state
type PlayerState = {
  playerId: string;
  userId: string;
  username: string;

  character: Character;
  faction: Faction;

  maxHp: number;
  damage: number;

  area: Area | null;

  isAlive: boolean;
  revealed: boolean;

  equipment: Card[];

  flags: {
    immuneToAttack?: boolean;
    extraTurn?: boolean;
    usedSkill?: boolean;
  };
};
6. Socket events
Client → Server
socket.emit("room:create");
socket.emit("room:join", { code });
socket.emit("room:ready");
socket.emit("game:start");

socket.emit("turn:rollMove");
socket.emit("turn:chooseArea", { area });

socket.emit("area:useAction", payload);

socket.emit("combat:attack", { targetPlayerId });

socket.emit("card:use", {
  cardId,
  targetPlayerId,
});

socket.emit("character:reveal");
socket.emit("character:useSkill", payload);
Server → Client
socket.emit("room:update", publicRoomState);
socket.emit("game:update", publicGameState);

socket.emit("private:character", character);
socket.emit("private:hermitCard", card);

socket.emit("turn:started", { playerId });
socket.emit("dice:rolled", result);

socket.emit("combat:resolved", result);

socket.emit("game:ended", {
  winners,
  allCharacters,
});
7. Public vs private state

Backend phải tách cực rõ:

Public state
type PublicPlayerState = {
  playerId: string;
  username: string;
  damage: number;
  maxHp: number;
  area: Area | null;
  isAlive: boolean;
  revealed: boolean;
  revealedCharacter?: Character;
  equipment: Card[];
};
Private state

Chỉ gửi cho chính player đó:

type PrivatePlayerState = {
  character: Character;
  faction: Faction;
  winCondition: string;
};
8. Game start logic
function startGame(room: Room): GameState {
  const players = room.players;

  if (players.length < 4 || players.length > 8) {
    throw new Error("Shadow Hunters requires 4-8 players");
  }

  const distribution = getFactionDistribution(players.length);

  const characters = pickCharacters(distribution);

  const shuffledCharacters = shuffle(characters);

  return {
    roomId: room.id,
    status: "IN_PROGRESS",
    players: players.map((p, index) => {
      const character = shuffledCharacters[index];

      return {
        playerId: p.id,
        userId: p.userId,
        username: p.username,
        character,
        faction: character.faction,
        maxHp: character.maxHp,
        damage: 0,
        area: null,
        isAlive: true,
        revealed: false,
        equipment: [],
        flags: {},
      };
    }),
    currentTurnPlayerId: players[0].id,
    decks: {
      white: shuffle(WHITE_CARDS),
      black: shuffle(BLACK_CARDS),
      hermit: shuffle(HERMIT_CARDS),
    },
    discard: {
      white: [],
      black: [],
      hermit: [],
    },
    winnerPlayerIds: [],
    turnPhase: "MOVE",
  };
}
9. Faction distribution
function getFactionDistribution(playerCount: number) {
  const table = {
    4: { hunters: 2, shadows: 2, neutrals: 0 },
    5: { hunters: 2, shadows: 2, neutrals: 1 },
    6: { hunters: 2, shadows: 2, neutrals: 2 },
    7: { hunters: 2, shadows: 2, neutrals: 3 },
    8: { hunters: 3, shadows: 3, neutrals: 2 },
  };

  return table[playerCount as keyof typeof table];
}
10. Movement logic
function rollMove(player: PlayerState): {
  d4: number;
  d6: number;
  total: number;
  area: Area | "CHOOSE";
} {
  const d4 = rollDie(4);
  const d6 = rollDie(6);
  const total = d4 + d6;

  if (total === 7) {
    return { d4, d6, total, area: "CHOOSE" };
  }

  const area = getAreaFromRoll(total);

  if (area === player.area) {
    return rollMove(player);
  }

  return { d4, d6, total, area };
}
function getAreaFromRoll(total: number): Area {
  if (total === 2 || total === 3) return "HERMIT_CABIN";
  if (total === 4 || total === 5) return "UNDERWORLD_GATE";
  if (total === 6) return "CHURCH";
  if (total === 8) return "CEMETERY";
  if (total === 9) return "WEIRD_WOODS";
  if (total === 10) return "ERSTWHILE_ALTAR";

  throw new Error("Invalid movement roll");
}
11. Area action logic
function useAreaAction(
  state: GameState,
  playerId: string,
  payload: any
): GameState {
  const player = getPlayer(state, playerId);

  switch (player.area) {
    case "HERMIT_CABIN":
      return drawHermitAndGive(state, playerId, payload.targetPlayerId);

    case "CHURCH":
      return drawCard(state, playerId, "white");

    case "CEMETERY":
      return drawCard(state, playerId, "black");

    case "UNDERWORLD_GATE":
      return drawCard(state, playerId, payload.deck);

    case "WEIRD_WOODS":
      return resolveWeirdWoods(
        state,
        payload.targetPlayerId,
        payload.action
      );

    case "ERSTWHILE_ALTAR":
      return stealEquipment(
        state,
        playerId,
        payload.targetPlayerId,
        payload.cardId
      );
  }
}
12. Combat logic
function attack(
  state: GameState,
  attackerId: string,
  targetId: string
): GameState {
  const attacker = getPlayer(state, attackerId);
  const target = getPlayer(state, targetId);

  if (!canAttack(attacker, target)) {
    throw new Error("Target is not in attack range");
  }

  const d4 = rollDie(4);
  const d6 = rollDie(6);

  let damage = Math.abs(d6 - d4);

  if (damage === 0) {
    return logEvent(state, "ATTACK_MISS", {
      attackerId,
      targetId,
      d4,
      d6,
    });
  }

  damage = applyAttackModifiers(state, attacker, target, damage);

  state = dealDamage(state, targetId, damage, {
    source: "ATTACK",
    attackerId,
  });

  state = resolvePostAttackEffects(state, attacker, target, damage);

  return checkWinConditions(state);
}
13. Attack range
function canAttack(
  attacker: PlayerState,
  target: PlayerState
): boolean {
  if (!attacker.isAlive || !target.isAlive) return false;
  if (attacker.playerId === target.playerId) return false;

  const hasHandgun = attacker.equipment.some(
    card => card.id === "HANDGUN"
  );

  if (hasHandgun) {
    return attacker.area !== target.area;
  }

  return getAreaGroup(attacker.area) === getAreaGroup(target.area);
}
function getAreaGroup(area: Area | null): number {
  switch (area) {
    case "HERMIT_CABIN":
    case "UNDERWORLD_GATE":
      return 1;

    case "CHURCH":
    case "CEMETERY":
      return 2;

    case "WEIRD_WOODS":
    case "ERSTWHILE_ALTAR":
      return 3;

    default:
      throw new Error("Invalid area");
  }
}
14. Damage system
function dealDamage(
  state: GameState,
  targetId: string,
  amount: number,
  context: DamageContext
): GameState {
  const target = getPlayer(state, targetId);

  if (!target.isAlive) return state;

  const finalDamage = Math.max(0, amount);

  target.damage += finalDamage;

  if (target.damage >= target.maxHp) {
    target.isAlive = false;
    target.revealed = true;

    state = logEvent(state, "PLAYER_DIED", {
      playerId: targetId,
      characterId: target.character.id,
    });
  }

  return checkWinConditions(state);
}
15. Card model
type Card = {
  id: string;
  name: string;
  deck: CardType;
  subtype: "SINGLE_USE" | "EQUIPMENT";
  effectId: string;
};

Ví dụ:

const BLACK_CARDS: Card[] = [
  {
    id: "VAMPIRE_BAT_1",
    name: "Vampire Bat",
    deck: "BLACK",
    subtype: "SINGLE_USE",
    effectId: "VAMPIRE_BAT",
  },
  {
    id: "HANDGUN",
    name: "Handgun",
    deck: "BLACK",
    subtype: "EQUIPMENT",
    effectId: "HANDGUN",
  },
];
16. Card effect registry

Nên dùng registry thay vì hard-code lung tung.

type CardEffectHandler = (
  state: GameState,
  playerId: string,
  payload: any
) => GameState;

const cardEffects: Record<string, CardEffectHandler> = {
  VAMPIRE_BAT: (state, playerId, payload) => {
    state = dealDamage(state, payload.targetPlayerId, 2, {
      source: "CARD",
      cardId: "VAMPIRE_BAT",
    });

    state = healDamage(state, playerId, 1);

    return state;
  },

  BLOODTHIRSTY_SPIDER: (state, playerId, payload) => {
    state = dealDamage(state, payload.targetPlayerId, 2, {
      source: "CARD",
      cardId: "BLOODTHIRSTY_SPIDER",
    });

    state = dealDamage(state, playerId, 2, {
      source: "CARD",
      cardId: "BLOODTHIRSTY_SPIDER",
    });

    return state;
  },

  HOLY_WATER_OF_HEALING: (state, playerId) => {
    return healDamage(state, playerId, 2);
  },

  // === WHITE SINGLE-USE ===

  HUNTER_FULL_HEAL: (state, playerId) => {
    const player = getPlayer(state, playerId);
    if (player.faction !== "HUNTER") return state;
    player.revealed = true;
    player.damage = 0;
    return state;
  },

  SHADOW_FULL_HEAL: (state, playerId) => {
    const player = getPlayer(state, playerId);
    if (player.faction !== "SHADOW") return state;
    player.revealed = true;
    player.damage = 0;
    return state;
  },

  NAME_GROUP_FULL_HEAL_A_E_U: (state, playerId) => {
    const player = getPlayer(state, playerId);
    const first = player.character.name[0].toUpperCase();
    if (!["A", "E", "U"].includes(first)) return state;
    player.revealed = true;
    player.damage = 0;
    return state;
  },

  FORCE_REVEAL_NAME_GROUP_V_W: (state, _playerId, payload) => {
    const target = getPlayer(state, payload.targetPlayerId);
    const first = target.character.name[0].toUpperCase();
    if (["V", "W"].includes(first)) {
      target.revealed = true;
    }
    return state;
  },

  TARGET_HEAL_D6: (state, _playerId, payload) => {
    const heal = rollDie(6);
    return healDamage(state, payload.targetPlayerId, heal);
  },

  SET_TARGET_DAMAGE_TO_7: (state, _playerId, payload) => {
    const target = getPlayer(state, payload.targetPlayerId);
    if (!target.isAlive) return state;
    target.damage = 7;
    return checkWinConditions(state);
  },

  DAMAGE_ALL_OTHERS_2: (state, playerId) => {
    for (const player of state.players) {
      if (player.playerId !== playerId && player.isAlive) {
        state = dealDamage(state, player.playerId, 2, {
          source: "CARD",
          cardId: "FLARE_OF_JUDGEMENT",
        });
      }
    }
    return state;
  },

  IMMUNE_TO_ATTACK_UNTIL_NEXT_TURN: (state, playerId) => {
    const player = getPlayer(state, playerId);
    player.flags.immuneToAttack = true;
    return state;
  },

  GAIN_EXTRA_TURN: (state, playerId) => {
    const player = getPlayer(state, playerId);
    player.flags.extraTurn = true;
    return state;
  },

  // === BLACK SINGLE-USE ===

  GIVE_EQUIPMENT_OR_SELF_DAMAGE_1: (state, playerId, payload) => {
    const player = getPlayer(state, playerId);
    if (player.equipment.length === 0) {
      return dealDamage(state, playerId, 1, {
        source: "CARD",
        cardId: "BANANA_PEEL",
      });
    }
    const card = player.equipment.find(c => c.id === payload.cardId);
    if (!card) throw new Error("Equipment not found");
    player.equipment = player.equipment.filter(c => c.id !== payload.cardId);
    const target = getPlayer(state, payload.targetPlayerId);
    target.equipment.push(card);
    return state;
  },

  // Roll 2d6: tổng khớp area nào → mọi người ở đó nhận 3 damage (Talisman chặn).
  // Tổng = 7 → không có gì xảy ra.
  ROLL_2D6_DAMAGE_AREA_3: (state) => {
    const d1 = rollDie(6);
    const d2 = rollDie(6);
    const total = d1 + d2;

    if (total === 7) {
      return logEvent(state, "CARD_NO_EFFECT", { cardId: "DYNAMITE", d1, d2 });
    }

    const targetArea = getAreaFromRoll(total);

    for (const player of state.players) {
      if (player.area === targetArea && player.isAlive) {
        const hasTalisman = player.equipment.some(
          c => c.effectId === "IMMUNE_SPECIFIC_BLACK_CARDS"
        );
        if (!hasTalisman) {
          state = dealDamage(state, player.playerId, 3, {
            source: "CARD",
            cardId: "DYNAMITE",
          });
        }
      }
    }

    return state;
  },

  STEAL_ONE_EQUIPMENT: (state, playerId, payload) => {
    const target = getPlayer(state, payload.targetPlayerId);
    const card = target.equipment.find(c => c.id === payload.cardId);
    if (!card) throw new Error("Equipment not found");
    target.equipment = target.equipment.filter(c => c.id !== payload.cardId);
    const player = getPlayer(state, playerId);
    player.equipment.push(card);
    return state;
  },

  ROLL_D6_TARGET_OR_SELF_DAMAGE_3: (state, playerId, payload) => {
    const roll = rollDie(6);
    if (roll <= 4) {
      return dealDamage(state, payload.targetPlayerId, 3, {
        source: "CARD",
        cardId: "SPIRITUAL_DOLL",
      });
    }
    return dealDamage(state, playerId, 3, {
      source: "CARD",
      cardId: "SPIRITUAL_DOLL",
    });
  },

  // === HERMIT CARDS ===
  // targetId = người nhận card; playerId = người rút (current player)

  // Aid: nếu Hunter → hồi 1. Nếu không phải Hunter VÀ damage = 0 → nhận 1 damage.
  IF_HUNTER_HEAL_1_ELSE_IF_FULL_DAMAGE_1: (state, _playerId, payload) => {
    const target = getPlayer(state, payload.targetPlayerId);
    if (target.faction === "HUNTER") {
      if (target.damage > 0) return healDamage(state, payload.targetPlayerId, 1);
      return state;
    }
    if (target.damage === 0) {
      return dealDamage(state, payload.targetPlayerId, 1, {
        source: "HERMIT_CARD",
        cardId: "AID",
      });
    }
    return state;
  },

  // Huddle: nếu Shadow → hồi 1. Nếu không phải Shadow VÀ damage = 0 → nhận 1 damage.
  IF_SHADOW_HEAL_1_ELSE_IF_FULL_DAMAGE_1: (state, _playerId, payload) => {
    const target = getPlayer(state, payload.targetPlayerId);
    if (target.faction === "SHADOW") {
      if (target.damage > 0) return healDamage(state, payload.targetPlayerId, 1);
      return state;
    }
    if (target.damage === 0) {
      return dealDamage(state, payload.targetPlayerId, 1, {
        source: "HERMIT_CARD",
        cardId: "HUDDLE",
      });
    }
    return state;
  },

  // Nurturance: nếu Neutral → hồi 1. Nếu không phải Neutral VÀ damage = 0 → nhận 1 damage.
  IF_NEUTRAL_HEAL_1_ELSE_IF_FULL_DAMAGE_1: (state, _playerId, payload) => {
    const target = getPlayer(state, payload.targetPlayerId);
    if (target.faction === "NEUTRAL") {
      if (target.damage > 0) return healDamage(state, payload.targetPlayerId, 1);
      return state;
    }
    if (target.damage === 0) {
      return dealDamage(state, payload.targetPlayerId, 1, {
        source: "HERMIT_CARD",
        cardId: "NURTURANCE",
      });
    }
    return state;
  },

  IF_HUNTER_OR_SHADOW_GIVE_EQUIPMENT_OR_DAMAGE_1: (state, playerId, payload) => {
    const target = getPlayer(state, payload.targetPlayerId);
    if (target.faction !== "HUNTER" && target.faction !== "SHADOW") return state;
    if (target.equipment.length === 0) {
      return dealDamage(state, payload.targetPlayerId, 1, {
        source: "HERMIT_CARD",
        cardId: "ANGER",
      });
    }
    const card = target.equipment[0];
    target.equipment = target.equipment.slice(1);
    getPlayer(state, playerId).equipment.push(card);
    return state;
  },

  IF_HUNTER_OR_NEUTRAL_GIVE_EQUIPMENT_OR_DAMAGE_1: (state, playerId, payload) => {
    const target = getPlayer(state, payload.targetPlayerId);
    if (target.faction !== "HUNTER" && target.faction !== "NEUTRAL") return state;
    if (target.equipment.length === 0) {
      return dealDamage(state, payload.targetPlayerId, 1, {
        source: "HERMIT_CARD",
        cardId: "BLACKMAIL",
      });
    }
    const card = target.equipment[0];
    target.equipment = target.equipment.slice(1);
    getPlayer(state, playerId).equipment.push(card);
    return state;
  },

  IF_NEUTRAL_OR_SHADOW_GIVE_EQUIPMENT_OR_DAMAGE_1: (state, playerId, payload) => {
    const target = getPlayer(state, payload.targetPlayerId);
    if (target.faction !== "NEUTRAL" && target.faction !== "SHADOW") return state;
    if (target.equipment.length === 0) {
      return dealDamage(state, payload.targetPlayerId, 1, {
        source: "HERMIT_CARD",
        cardId: "GREED",
      });
    }
    const card = target.equipment[0];
    target.equipment = target.equipment.slice(1);
    getPlayer(state, playerId).equipment.push(card);
    return state;
  },

  IF_SHADOW_DAMAGE_2: (state, _playerId, payload) => {
    const target = getPlayer(state, payload.targetPlayerId);
    if (target.faction !== "SHADOW") return state;
    return dealDamage(state, payload.targetPlayerId, 2, {
      source: "HERMIT_CARD",
      cardId: "EXORCISM",
    });
  },

  IF_HUNTER_DAMAGE_1: (state, _playerId, payload) => {
    const target = getPlayer(state, payload.targetPlayerId);
    if (target.faction !== "HUNTER") return state;
    return dealDamage(state, payload.targetPlayerId, 1, {
      source: "HERMIT_CARD",
      cardId: "SLAP",
    });
  },

  IF_SHADOW_DAMAGE_1: (state, _playerId, payload) => {
    const target = getPlayer(state, payload.targetPlayerId);
    if (target.faction !== "SHADOW") return state;
    return dealDamage(state, payload.targetPlayerId, 1, {
      source: "HERMIT_CARD",
      cardId: "SPELL",
    });
  },

  // Prediction: người nhận cho người rút xem character card (xử lý ở socket layer)
  SHOW_CHARACTER_TO_CARD_OWNER: (state, playerId, payload) => {
    const target = getPlayer(state, payload.targetPlayerId);
    state = logEvent(state, "PREDICTION_REVEAL", {
      toPlayerId: playerId,
      character: target.character,
    });
    return state;
  },

  IF_LOW_HP_OR_NAME_GROUP_A_B_C_E_U_DAMAGE_1: (state, _playerId, payload) => {
    const target = getPlayer(state, payload.targetPlayerId);
    const first = target.character.name[0].toUpperCase();
    const inGroup = ["A", "B", "C", "E", "U"].includes(first);
    if (!inGroup) return state;
    return dealDamage(state, payload.targetPlayerId, 1, {
      source: "HERMIT_CARD",
      cardId: "BULLY",
    });
  },

  IF_HIGH_HP_OR_NAME_GROUP_D_F_G_V_W_DAMAGE_2: (state, _playerId, payload) => {
    const target = getPlayer(state, payload.targetPlayerId);
    const first = target.character.name[0].toUpperCase();
    const inGroup = ["D", "F", "G", "V", "W"].includes(first);
    if (!inGroup) return state;
    return dealDamage(state, payload.targetPlayerId, 2, {
      source: "HERMIT_CARD",
      cardId: "TOUGH_LESSON",
    });
  },
};
17. Character model
type Character = {
  id: string;
  name: string;
  faction: Faction;
  maxHp: number;
  skillId: string;
  winConditionId: string;
};

Ví dụ:

const CHARACTERS: Character[] = [
  {
    id: "ALLIE",
    name: "Allie",
    faction: "NEUTRAL",
    maxHp: 8,
    skillId: "ALLIE_FULL_HEAL",
    winConditionId: "ALLIE_SURVIVE",
  },
  {
    id: "FRANKLIN",
    name: "Franklin",
    faction: "HUNTER",
    maxHp: 12,
    skillId: "FRANKLIN_D6_DAMAGE",
    winConditionId: "HUNTER_WIN",
  },
  {
    id: "VAMPIRE",
    name: "Vampire",
    faction: "SHADOW",
    maxHp: 13,
    skillId: "VAMPIRE_HEAL_ON_ATTACK",
    winConditionId: "SHADOW_WIN",
  },
];
18. Character skill registry
type SkillHandler = (
  state: GameState,
  playerId: string,
  payload: any
) => GameState;

const skillHandlers: Record<string, SkillHandler> = {
  ALLIE_FULL_HEAL: (state, playerId) => {
    const player = getPlayer(state, playerId);

    if (player.flags.usedSkill) {
      throw new Error("Skill already used");
    }

    player.damage = 0;
    player.revealed = true;
    player.flags.usedSkill = true;

    return state;
  },

  FRANKLIN_D6_DAMAGE: (state, playerId, payload) => {
    const player = getPlayer(state, playerId);

    if (player.flags.usedSkill) {
      throw new Error("Skill already used");
    }

    const damage = rollDie(6);

    player.revealed = true;
    player.flags.usedSkill = true;

    return dealDamage(state, payload.targetPlayerId, damage, {
      source: "SKILL",
      attackerId: playerId,
    });
  },

  VAMPIRE_HEAL_ON_ATTACK: (state, playerId) => {
    return healDamage(state, playerId, 2);
  },
};
19. Win condition engine
function checkWinConditions(state: GameState): GameState {
  const aliveHunters = state.players.filter(
    p => p.faction === "HUNTER" && p.isAlive
  );

  const aliveShadows = state.players.filter(
    p => p.faction === "SHADOW" && p.isAlive
  );

  const deadNeutrals = state.players.filter(
    p => p.faction === "NEUTRAL" && !p.isAlive
  );

  const winners = new Set<string>();

  if (aliveShadows.length === 0) {
    for (const p of state.players) {
      if (p.faction === "HUNTER") {
        winners.add(p.playerId);
      }
    }
  }

  if (aliveHunters.length === 0 || deadNeutrals.length >= 3) {
    for (const p of state.players) {
      if (p.faction === "SHADOW") {
        winners.add(p.playerId);
      }
    }
  }

  for (const player of state.players) {
    if (checkNeutralWinCondition(state, player)) {
      winners.add(player.playerId);
    }
  }

  if (winners.size > 0) {
    state.status = "FINISHED";
    state.winnerPlayerIds = [...winners];
  }

  return state;
}
20. Neutral win conditions
function checkNeutralWinCondition(
  state: GameState,
  player: PlayerState
): boolean {
  if (player.faction !== "NEUTRAL") return false;

  switch (player.character.id) {
    case "ALLIE":
      return state.status === "FINISHED" && player.isAlive;

    case "BOB":
      return player.equipment.length >= 5;

    case "DANIEL": {
      const deaths = state.players.filter(p => !p.isAlive);

      const isFirstDead =
        deaths.length >= 1 &&
        deaths[0].playerId === player.playerId;

      const huntersWin = state.players.some(
        p =>
          p.faction === "HUNTER" &&
          state.winnerPlayerIds.includes(p.playerId)
      );

      return isFirstDead || (player.isAlive && huntersWin);
    }

    case "CHARLES": {
      return Boolean(player.flags.charlesKilledPlayerAfterThreeDeaths);
    }

    default:
      return false;
  }
}
21. Turn engine
function endTurn(state: GameState): GameState {
  const current = getPlayer(state, state.currentTurnPlayerId);

  current.flags.immuneToAttack = false;

  if (current.flags.extraTurn) {
    current.flags.extraTurn = false;
    state.turnPhase = "MOVE";
    return state;
  }

  const alivePlayers = state.players.filter(p => p.isAlive);
  const currentIndex = alivePlayers.findIndex(
    p => p.playerId === current.playerId
  );

  const nextPlayer =
    alivePlayers[(currentIndex + 1) % alivePlayers.length];

  state.currentTurnPlayerId = nextPlayer.playerId;
  state.turnPhase = "MOVE";

  return state;
}
22. Backend folder structure
src/
  server.ts
  socket.ts

  modules/
    auth/
    rooms/
    games/

  game/
    engine/
      startGame.ts
      turnEngine.ts
      movement.ts
      combat.ts
      damage.ts
      winConditions.ts

    data/
      characters.ts
      whiteCards.ts
      blackCards.ts
      hermitCards.ts

    effects/
      cardEffects.ts
      skillEffects.ts
      equipmentEffects.ts

    types/
      game.types.ts
      card.types.ts
      character.types.ts

  db/
    prisma.ts
    schema.prisma

  utils/
    dice.ts
    shuffle.ts
23. API routes
POST /auth/guest
POST /rooms
POST /rooms/:code/join
GET  /rooms/:id
POST /rooms/:id/start

Realtime game actions nên đi qua Socket.io.

24. Socket room lifecycle
io.on("connection", socket => {
  socket.on("room:create", createRoomHandler);
  socket.on("room:join", joinRoomHandler);
  socket.on("room:ready", readyHandler);

  socket.on("game:start", startGameHandler);

  socket.on("turn:rollMove", rollMoveHandler);
  socket.on("turn:chooseArea", chooseAreaHandler);
  socket.on("area:useAction", areaActionHandler);
  socket.on("combat:attack", attackHandler);

  socket.on("card:use", useCardHandler);
  socket.on("character:reveal", revealHandler);
  socket.on("character:useSkill", useSkillHandler);
});
25. MVP nên build theo thứ tự
Phase 1 — Core playable
Room create/join
Ready/start game
Assign hidden characters
Turn system
Movement
Area actions
Attack
Death
Win condition
Phase 2 — Card system
White cards
Black cards
Hermit cards
Equipment
Discard pile
Phase 3 — Character skills
Reveal
One-time skill
Passive skill
Neutral win condition
Phase 4 — Polish
Reconnect
Spectator
Chat
Game log
Animations
Match history
26. Quan trọng nhất cho online game

Bạn nên coi backend là server-authoritative:

Client chỉ gửi hành động.
Server mới được:
- roll dice
- chia bài
- tính damage
- xử lý skill
- xác định thắng thua

Không bao giờ để client tự tính kết quả, vì người chơi có thể cheat.
27. Equipment passive effects — applyAttackModifiers

Tất cả equipment passive được xử lý tập trung trong applyAttackModifiers.

function rollAttackDamage(attacker: PlayerState): {
  d4: number;
  d6: number;
  damage: number;
} {
  const hasMasamune = attacker.equipment.some(
    c => c.effectId === "MUST_ATTACK_DAMAGE_D4_NO_MISS"
  );

  if (hasMasamune) {
    const d4 = rollDie(4);
    // Masamune: damage = d4, không bao giờ miss (không dùng d6)
    return { d4, d6: 0, damage: d4 };
  }

  const d4 = rollDie(4);
  const d6 = rollDie(6);
  return { d4, d6, damage: Math.abs(d6 - d4) };
}

function applyAttackModifiers(
  state: GameState,
  attacker: PlayerState,
  target: PlayerState,
  baseDamage: number
): number {
  if (baseDamage === 0) return 0; // miss — không áp dụng modifier

  let damage = baseDamage;

  // ADD_1_ATTACK_DAMAGE: Butcher Knife, Chainsaw, Rusted Broad Axe — cộng dồn
  const bonusWeapons = attacker.equipment.filter(
    c => c.effectId === "ADD_1_ATTACK_DAMAGE"
  ).length;
  damage += bonusWeapons;

  // REDUCE_ATTACK_DAMAGE_DEALT_AND_RECEIVED: Holy Robe
  // Attacker có Holy Robe → gây ít hơn 1
  if (attacker.equipment.some(c => c.effectId === "REDUCE_ATTACK_DAMAGE_DEALT_AND_RECEIVED")) {
    damage = Math.max(0, damage - 1);
  }
  // Target có Holy Robe → nhận ít hơn 1
  if (target.equipment.some(c => c.effectId === "REDUCE_ATTACK_DAMAGE_DEALT_AND_RECEIVED")) {
    damage = Math.max(0, damage - 1);
  }

  return damage;
}

// Bắt buộc tấn công khi có Masamune — kiểm tra đầu ATTACK phase
function mustAttackDueToMasamune(
  state: GameState,
  attacker: PlayerState
): boolean {
  const hasMasamune = attacker.equipment.some(
    c => c.effectId === "MUST_ATTACK_DAMAGE_D4_NO_MISS"
  );
  if (!hasMasamune) return false;

  const validTargets = state.players.filter(
    p => p.isAlive && p.playerId !== attacker.playerId && canAttack(attacker, p)
  );

  return validTargets.length > 0;
}
28. Bob win condition — player-count aware

Bob's điều kiện thắng và skill phụ thuộc số người chơi trong phòng.

function checkBobWinCondition(
  state: GameState,
  player: PlayerState
): boolean {
  const playerCount = state.players.length;
  const threshold = playerCount <= 6 ? 4 : 5;
  return player.equipment.length >= threshold;
}

// Bob skill — xác định version khi start game và lưu vào flags
function resolveBobSkill(
  state: GameState,
  attackerId: string,
  targetId: string,
  damage: number,
  killed: boolean
): GameState {
  const attacker = getPlayer(state, attackerId);
  if (attacker.character.id !== "BOB" || !attacker.revealed) return state;

  const playerCount = state.players.length;

  if (playerCount <= 6) {
    // 4–6 người: có thể cướp 1 Equipment thay vì gây ≥2 damage
    // Client gửi payload.chooseSteał = true khi muốn kích hoạt
    // Việc thực tế swap damage → steal được xử lý trước dealDamage
    return state;
  } else {
    // 7–8 người: khi giết người → lấy hết Equipment
    if (killed) {
      const target = getPlayer(state, targetId);
      attacker.equipment.push(...target.equipment);
      target.equipment = [];
    }
    return state;
  }
}