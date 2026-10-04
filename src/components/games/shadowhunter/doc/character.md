{
    "game": {
      "id": "SHADOW_HUNTERS",
      "name": "Shadow Hunters",
      "supportedPlayers": {
        "min": 4,
        "max": 8
      },
      "factions": ["HUNTER", "SHADOW", "NEUTRAL"]
    },
    "playerDistribution": {
      "4": { "hunter": 2, "shadow": 2, "neutral": 0 },
      "5": { "hunter": 2, "shadow": 2, "neutral": 1 },
      "6": { "hunter": 2, "shadow": 2, "neutral": 2 },
      "7": { "hunter": 2, "shadow": 2, "neutral": 3 },
      "8": { "hunter": 3, "shadow": 3, "neutral": 2 }
    },
    "areas": [
      {
        "id": "HERMIT_CABIN",
        "name": "Hermit's Cabin",
        "rollValues": [2, 3],
        "group": 1,
        "effectId": "DRAW_HERMIT_AND_GIVE",
        "description": "Rút 1 Hermit Card, đọc bí mật rồi đưa cho người chơi khác xử lý."
      },
      {
        "id": "UNDERWORLD_GATE",
        "name": "Underworld Gate",
        "rollValues": [4, 5],
        "group": 1,
        "effectId": "DRAW_ANY_DECK",
        "description": "Chọn rút 1 lá từ White, Black hoặc Hermit deck."
      },
      {
        "id": "CHURCH",
        "name": "Church",
        "rollValues": [6],
        "group": 2,
        "effectId": "DRAW_WHITE",
        "description": "Rút 1 White Card."
      },
      {
        "id": "CEMETERY",
        "name": "Cemetery",
        "rollValues": [8],
        "group": 2,
        "effectId": "DRAW_BLACK",
        "description": "Rút 1 Black Card."
      },
      {
        "id": "WEIRD_WOODS",
        "name": "Weird Woods",
        "rollValues": [9],
        "group": 3,
        "effectId": "DAMAGE_OR_HEAL",
        "description": "Chọn 1 người chơi: gây 2 damage hoặc hồi 1 damage."
      },
      {
        "id": "ERSTWHILE_ALTAR",
        "name": "Erstwhile Altar",
        "rollValues": [10],
        "group": 3,
        "effectId": "STEAL_EQUIPMENT",
        "description": "Cướp 1 Equipment Card từ người chơi khác."
      }
    ],
    "movementSpecialRules": {
      "roll": "1d4 + 1d6",
      "rollSeven": "Người chơi được chọn bất kỳ area khác area hiện tại.",
      "sameArea": "Nếu roll ra đúng area hiện tại thì roll lại."
    },
    "cardTypes": {
      "WHITE": {
        "description": "Bài hỗ trợ, hồi máu, phòng thủ hoặc trang bị."
      },
      "BLACK": {
        "description": "Bài tấn công, gây damage hoặc trang bị tăng sức mạnh."
      },
      "HERMIT": {
        "description": "Bài dò phe, đưa cho người chơi khác đọc và xử lý bí mật."
      }
    },
    "cardSubtypes": {
      "SINGLE_USE": {
        "description": "Dùng một lần rồi bỏ vào discard pile."
      },
      "EQUIPMENT": {
        "description": "Đặt trước mặt người chơi, hiệu ứng tồn tại liên tục."
      }
    },
    "characters": [
      {
        "id": "ALLIE",
        "name": "Allie",
        "faction": "NEUTRAL",
        "hp": 8,
        "skillId": "ALLIE_FULL_HEAL",
        "skillName": "Mother's Love",
        "skillDescription": "Một lần trong game, sau khi reveal, hồi toàn bộ damage của bản thân về 0.",
        "skillTiming": "ANYTIME",
        "skillUsage": "ONCE_PER_GAME",
        "winConditionId": "ALLIE_SURVIVE",
        "winCondition": "Thắng nếu còn sống khi game kết thúc."
      },
      {
        "id": "BOB",
        "name": "Bob",
        "faction": "NEUTRAL",
        "hp": 10,
        "skillId": "BOB_STEAL_OR_KILL_LOOT",
        "skillName": "Robbery",
        "skillDescription": "4–6 người: Khi attack của Bob sắp gây từ 2 damage trở lên, Bob có thể không gây damage và thay vào đó cướp 1 Equipment từ mục tiêu. 7–8 người: Khi attack của Bob giết người chơi, Bob lấy toàn bộ Equipment của người đó.",
        "skillTiming": "ON_ATTACK_DAMAGE",
        "skillUsage": "PASSIVE_AFTER_REVEAL",
        "winConditionId": "BOB_COLLECT_EQUIPMENT",
        "winCondition": "Thắng nếu sở hữu ít nhất 4 Equipment (4–6 người chơi) hoặc ít nhất 5 Equipment (7–8 người chơi).",
        "winConditionByPlayerCount": {
          "4": 4, "5": 4, "6": 4,
          "7": 5, "8": 5
        }
      },
      {
        "id": "CHARLES",
        "name": "Charles",
        "faction": "NEUTRAL",
        "hp": 11,
        "skillId": "CHARLES_EXTRA_ATTACK",
        "skillName": "Bloody Feast",
        "skillDescription": "Sau khi attack, Charles có thể tự nhận 2 damage để attack thêm một lần nữa.",
        "skillTiming": "AFTER_ATTACK",
        "skillUsage": "REPEATABLE_AFTER_REVEAL",
        "winConditionId": "CHARLES_KILL_AFTER_THREE_DEATHS",
        "winCondition": "Thắng nếu Charles tự tay giết 1 người chơi và tổng số người chết trong game lúc đó ít nhất là 3."
      },
      {
        "id": "DANIEL",
        "name": "Daniel",
        "faction": "NEUTRAL",
        "hp": 13,
        "skillId": "DANIEL_AUTO_REVEAL",
        "skillName": "Scream",
        "skillDescription": "Khi có bất kỳ người chơi nào chết, Daniel phải reveal.",
        "skillTiming": "ON_ANY_DEATH",
        "skillUsage": "MANDATORY",
        "winConditionId": "DANIEL_FIRST_DEAD_OR_HUNTER_WIN",
        "winCondition": "Thắng nếu là người chết đầu tiên, hoặc còn sống khi phe Hunter thắng."
      },
      {
        "id": "EMI",
        "name": "Emi",
        "faction": "HUNTER",
        "hp": 10,
        "skillId": "EMI_ADJACENT_MOVE",
        "skillName": "Teleport",
        "skillDescription": "Khi di chuyển, Emi có thể không roll dice mà di chuyển sang area liền kề.",
        "skillTiming": "MOVEMENT_PHASE",
        "skillUsage": "PASSIVE_AFTER_REVEAL",
        "winConditionId": "HUNTER_WIN",
        "winCondition": "Thắng khi tất cả Shadow chết."
      },
      {
        "id": "FRANKLIN",
        "name": "Franklin",
        "faction": "HUNTER",
        "hp": 12,
        "skillId": "FRANKLIN_D6_DAMAGE",
        "skillName": "Lightning",
        "skillDescription": "Một lần trong game, sau khi reveal, chọn 1 người chơi và gây damage bằng kết quả roll 1d6.",
        "skillTiming": "ANYTIME_ON_TURN",
        "skillUsage": "ONCE_PER_GAME",
        "winConditionId": "HUNTER_WIN",
        "winCondition": "Thắng khi tất cả Shadow chết."
      },
      {
        "id": "GEORGE",
        "name": "George",
        "faction": "HUNTER",
        "hp": 14,
        "skillId": "GEORGE_D4_DAMAGE",
        "skillName": "Demolish",
        "skillDescription": "Một lần trong game, sau khi reveal, chọn 1 người chơi và gây damage bằng kết quả roll 1d4.",
        "skillTiming": "ANYTIME_ON_TURN",
        "skillUsage": "ONCE_PER_GAME",
        "winConditionId": "HUNTER_WIN",
        "winCondition": "Thắng khi tất cả Shadow chết."
      },
      {
        "id": "UNKNOWN",
        "name": "Unknown",
        "faction": "SHADOW",
        "hp": 11,
        "skillId": "UNKNOWN_LIE_HERMIT",
        "skillName": "Deceit",
        "skillDescription": "Unknown có thể nói dối khi xử lý Hermit Card. Skill này không cần reveal.",
        "skillTiming": "WHEN_RECEIVING_HERMIT",
        "skillUsage": "PASSIVE_NO_REVEAL_REQUIRED",
        "winConditionId": "SHADOW_WIN",
        "winCondition": "Thắng khi tất cả Hunter chết hoặc khi có ít nhất 3 Neutral chết."
      },
      {
        "id": "VAMPIRE",
        "name": "Vampire",
        "faction": "SHADOW",
        "hp": 13,
        "skillId": "VAMPIRE_HEAL_ON_ATTACK",
        "skillName": "Suck Blood",
        "skillDescription": "Khi Vampire attack và gây damage thành công, hồi 2 damage cho bản thân.",
        "skillTiming": "AFTER_SUCCESSFUL_ATTACK",
        "skillUsage": "PASSIVE_AFTER_REVEAL",
        "winConditionId": "SHADOW_WIN",
        "winCondition": "Thắng khi tất cả Hunter chết hoặc khi có ít nhất 3 Neutral chết."
      },
      {
        "id": "WEREWOLF",
        "name": "Werewolf",
        "faction": "SHADOW",
        "hp": 14,
        "skillId": "WEREWOLF_COUNTERATTACK",
        "skillName": "Counterattack",
        "skillDescription": "Sau khi bị attack, nếu còn sống, Werewolf có thể phản công ngay người vừa attack mình.",
        "skillTiming": "AFTER_BEING_ATTACKED",
        "skillUsage": "PASSIVE_AFTER_REVEAL",
        "winConditionId": "SHADOW_WIN",
        "winCondition": "Thắng khi tất cả Hunter chết hoặc khi có ít nhất 3 Neutral chết."
      },
      {
        "id": "AGNES",
        "name": "Agnes",
        "faction": "NEUTRAL",
        "hp": 8,
        "expansion": true,
        "skillId": "AGNES_SWITCH_TARGET",
        "skillName": "Capricious Love",
        "skillDescription": "Agnes có thể đổi điều kiện thắng giữa người chơi ngồi trước hoặc sau mình.",
        "skillTiming": "TURN_START",
        "skillUsage": "AFTER_REVEAL",
        "winConditionId": "AGNES_TARGET_PLAYER_WINS",
        "winCondition": "Thắng nếu người chơi được Agnes chọn làm mục tiêu thắng."
      },
      {
        "id": "BRYAN",
        "name": "Bryan",
        "faction": "NEUTRAL",
        "hp": 10,
        "expansion": true,
        "skillId": "BRYAN_REVEAL_ON_SMALL_KILL",
        "skillName": "My Pace",
        "skillDescription": "Nếu Bryan giết nhân vật có HP gốc 12 trở xuống, Bryan phải reveal.",
        "skillTiming": "ON_KILL",
        "skillUsage": "MANDATORY",
        "winConditionId": "BRYAN_KILL_HIGH_HP_OR_ALTAR",
        "winCondition": "Thắng nếu Bryan giết nhân vật có HP gốc từ 13 trở lên, hoặc Bryan đang ở Erstwhile Altar khi game kết thúc."
      },
      {
        "id": "CATHERINE",
        "name": "Catherine",
        "faction": "NEUTRAL",
        "hp": 11,
        "expansion": true,
        "skillId": "CATHERINE_HEAL_EACH_TURN",
        "skillName": "Stigmata",
        "skillDescription": "Đầu lượt của Catherine, hồi 1 damage.",
        "skillTiming": "TURN_START",
        "skillUsage": "PASSIVE_AFTER_REVEAL",
        "winConditionId": "CATHERINE_FIRST_DEAD_OR_FINAL_TWO",
        "winCondition": "Thắng nếu là người chết đầu tiên, hoặc là một trong hai người cuối cùng còn sống."
      },
      {
        "id": "DAVID",
        "name": "David",
        "faction": "NEUTRAL",
        "hp": 13,
        "expansion": true,
        "skillId": "DAVID_TAKE_DEAD_EQUIPMENT",
        "skillName": "Grave Robber",
        "skillDescription": "Một lần trong game, David có thể lấy 1 Equipment từ người chơi đã chết.",
        "skillTiming": "ANYTIME_ON_TURN",
        "skillUsage": "ONCE_PER_GAME_AFTER_REVEAL",
        "winConditionId": "DAVID_COLLECT_SPECIFIC_EQUIPMENT",
        "winCondition": "Thắng nếu sở hữu ít nhất 3 trong 4 Equipment: Talisman, Spear of Longinus, Holy Robe, Silver Rosary."
      },
      {
        "id": "ELLEN",
        "name": "Ellen",
        "faction": "HUNTER",
        "hp": 10,
        "expansion": true,
        "skillId": "ELLEN_DISABLE_SKILL",
        "skillName": "Seal",
        "skillDescription": "Một lần trong game, Ellen có thể vô hiệu hóa vĩnh viễn skill của 1 nhân vật đã reveal.",
        "skillTiming": "ANYTIME_ON_TURN",
        "skillUsage": "ONCE_PER_GAME_AFTER_REVEAL",
        "winConditionId": "HUNTER_WIN",
        "winCondition": "Thắng khi tất cả Shadow chết."
      },
      {
        "id": "FUKA",
        "name": "Fu-ka",
        "faction": "HUNTER",
        "hp": 12,
        "expansion": true,
        "skillId": "FUKA_SET_DAMAGE_TO_SEVEN_NEXT_TURN",
        "skillName": "Dynamite Nurse",
        "skillDescription": "Một lần trong game, Fu-ka chọn 1 người chơi. Đầu lượt tiếp theo của Fu-ka, damage của người đó được đặt thành 7.",
        "skillTiming": "ANYTIME_ON_TURN",
        "skillUsage": "ONCE_PER_GAME_AFTER_REVEAL",
        "winConditionId": "HUNTER_WIN",
        "winCondition": "Thắng khi tất cả Shadow chết."
      },
      {
        "id": "GREGOR",
        "name": "Gregor",
        "faction": "HUNTER",
        "hp": 14,
        "expansion": true,
        "skillId": "GREGOR_TEMPORARY_IMMUNITY",
        "skillName": "Barricade",
        "skillDescription": "Một lần trong game, Gregor không nhận damage cho đến đầu lượt tiếp theo của mình.",
        "skillTiming": "ANYTIME_ON_TURN",
        "skillUsage": "ONCE_PER_GAME_AFTER_REVEAL",
        "winConditionId": "HUNTER_WIN",
        "winCondition": "Thắng khi tất cả Shadow chết."
      },
      {
        "id": "ULTRA_SOUL",
        "name": "Ultra Soul",
        "faction": "SHADOW",
        "hp": 11,
        "expansion": true,
        "skillId": "ULTRA_SOUL_DAMAGE_UNDERWORLD",
        "skillName": "Soul Attack",
        "skillDescription": "Đầu lượt, Ultra Soul có thể gây 3 damage cho 1 người chơi đang ở Underworld Gate.",
        "skillTiming": "TURN_START",
        "skillUsage": "AFTER_REVEAL",
        "winConditionId": "SHADOW_WIN",
        "winCondition": "Thắng khi tất cả Hunter chết hoặc khi có ít nhất 3 Neutral chết."
      },
      {
        "id": "VALKYRIE",
        "name": "Valkyrie",
        "faction": "SHADOW",
        "hp": 13,
        "expansion": true,
        "skillId": "VALKYRIE_D4_ATTACK",
        "skillName": "Spear Mastery",
        "skillDescription": "Khi Valkyrie attack, damage bằng roll 1d4 và không miss.",
        "skillTiming": "ON_ATTACK",
        "skillUsage": "PASSIVE_AFTER_REVEAL",
        "winConditionId": "SHADOW_WIN",
        "winCondition": "Thắng khi tất cả Hunter chết hoặc khi có ít nhất 3 Neutral chết."
      },
      {
        "id": "WIGHT",
        "name": "Wight",
        "faction": "SHADOW",
        "hp": 14,
        "expansion": true,
        "skillId": "WIGHT_EXTRA_TURNS_BY_DEAD_COUNT",
        "skillName": "Revenge",
        "skillDescription": "Một lần trong game, Wight nhận thêm số lượt bằng số người chơi đã chết.",
        "skillTiming": "TURN_END",
        "skillUsage": "ONCE_PER_GAME_AFTER_REVEAL",
        "winConditionId": "SHADOW_WIN",
        "winCondition": "Thắng khi tất cả Hunter chết hoặc khi có ít nhất 3 Neutral chết."
      }
    ],
    "cards": [
      {
        "id": "WHITE_ADVENT",
        "name": "Advent",
        "deck": "WHITE",
        "subtype": "SINGLE_USE",
        "copies": 1,
        "effectId": "HUNTER_FULL_HEAL",
        "description": "Nếu người chơi là Hunter, có thể reveal và hồi toàn bộ damage về 0."
      },
      {
        "id": "WHITE_BLESSING",
        "name": "Blessing",
        "deck": "WHITE",
        "subtype": "SINGLE_USE",
        "copies": 1,
        "effectId": "TARGET_HEAL_D6",
        "description": "Chọn 1 người chơi khác, roll 1d6, người đó hồi số damage bằng kết quả roll."
      },
      {
        "id": "WHITE_CONCEALED_KNOWLEDGE",
        "name": "Concealed Knowledge",
        "deck": "WHITE",
        "subtype": "SINGLE_USE",
        "copies": 1,
        "effectId": "GAIN_EXTRA_TURN",
        "description": "Sau lượt hiện tại, người chơi được thực hiện thêm 1 lượt nữa."
      },
      {
        "id": "WHITE_FIRST_AID",
        "name": "First Aid",
        "deck": "WHITE",
        "subtype": "SINGLE_USE",
        "copies": 1,
        "effectId": "SET_TARGET_DAMAGE_TO_7",
        "description": "Chọn 1 người chơi, đặt damage của người đó thành 7."
      },
      {
        "id": "WHITE_FLARE_OF_JUDGEMENT",
        "name": "Flare of Judgement",
        "deck": "WHITE",
        "subtype": "SINGLE_USE",
        "copies": 1,
        "effectId": "DAMAGE_ALL_OTHERS_2",
        "description": "Tất cả người chơi khác nhận 2 damage."
      },
      {
        "id": "WHITE_GUARDIAN_ANGEL",
        "name": "Guardian Angel",
        "deck": "WHITE",
        "subtype": "SINGLE_USE",
        "copies": 1,
        "effectId": "IMMUNE_TO_ATTACK_UNTIL_NEXT_TURN",
        "description": "Người chơi không nhận damage từ attack cho đến đầu lượt tiếp theo của mình."
      },
      {
        "id": "WHITE_HOLY_WATER_OF_HEALING",
        "name": "Holy Water of Healing",
        "deck": "WHITE",
        "subtype": "SINGLE_USE",
        "copies": 2,
        "effectId": "SELF_HEAL_2",
        "description": "Hồi 2 damage cho bản thân."
      },
      {
        "id": "WHITE_CHOCOLATE",
        "name": "Chocolate",
        "deck": "WHITE",
        "subtype": "SINGLE_USE",
        "copies": 1,
        "expansion": true,
        "effectId": "NAME_GROUP_FULL_HEAL_A_E_U",
        "description": "Nếu tên nhân vật thuộc nhóm A, E hoặc U, có thể reveal và hồi toàn bộ damage về 0."
      },
      {
        "id": "WHITE_DISENCHANT_MIRROR",
        "name": "Disenchant Mirror",
        "deck": "WHITE",
        "subtype": "SINGLE_USE",
        "copies": 1,
        "expansion": true,
        "effectId": "FORCE_REVEAL_NAME_GROUP_V_W",
        "description": "Nếu tên nhân vật thuộc nhóm V hoặc W, nhân vật đó phải reveal."
      },
      {
        "id": "WHITE_FORTUNE_BROOCH",
        "name": "Fortune Brooch",
        "deck": "WHITE",
        "subtype": "EQUIPMENT",
        "copies": 1,
        "effectId": "IGNORE_WEIRD_WOODS_DAMAGE",
        "description": "Không nhận damage từ hiệu ứng Weird Woods."
      },
      {
        "id": "WHITE_HOLY_ROBE",
        "name": "Holy Robe",
        "deck": "WHITE",
        "subtype": "EQUIPMENT",
        "copies": 1,
        "effectId": "REDUCE_ATTACK_DAMAGE_DEALT_AND_RECEIVED",
        "description": "Damage attack bạn gây giảm 1. Damage attack bạn nhận cũng giảm 1."
      },
      {
        "id": "WHITE_MYSTIC_COMPASS",
        "name": "Mystic Compass",
        "deck": "WHITE",
        "subtype": "EQUIPMENT",
        "copies": 1,
        "effectId": "ROLL_MOVEMENT_TWICE_CHOOSE_ONE",
        "description": "Khi di chuyển, roll movement 2 lần và chọn 1 kết quả."
      },
      {
        "id": "WHITE_SILVER_ROSARY",
        "name": "Silver Rosary",
        "deck": "WHITE",
        "subtype": "EQUIPMENT",
        "copies": 1,
        "effectId": "TAKE_ALL_EQUIPMENT_ON_KILL",
        "description": "Nếu bạn attack và giết người chơi khác, lấy toàn bộ Equipment của người đó."
      },
      {
        "id": "WHITE_SPEAR_OF_LONGINUS",
        "name": "Spear of Longinus",
        "deck": "WHITE",
        "subtype": "EQUIPMENT",
        "copies": 1,
        "effectId": "HUNTER_REVEAL_ADD_2_ATTACK_DAMAGE",
        "description": "Nếu bạn là Hunter và attack thành công, có thể reveal để gây thêm 2 damage."
      },
      {
        "id": "WHITE_TALISMAN",
        "name": "Talisman",
        "deck": "WHITE",
        "subtype": "EQUIPMENT",
        "copies": 1,
        "effectId": "IMMUNE_SPECIFIC_BLACK_CARDS",
        "description": "Không nhận damage từ Bloodthirsty Spider, Vampire Bat và Dynamite."
      },
      {
        "id": "BLACK_BANANA_PEEL",
        "name": "Banana Peel",
        "deck": "BLACK",
        "subtype": "SINGLE_USE",
        "copies": 1,
        "effectId": "GIVE_EQUIPMENT_OR_SELF_DAMAGE_1",
        "description": "Đưa 1 Equipment của bạn cho người chơi khác. Nếu không có Equipment, nhận 1 damage."
      },
      {
        "id": "BLACK_BLOODTHIRSTY_SPIDER",
        "name": "Bloodthirsty Spider",
        "deck": "BLACK",
        "subtype": "SINGLE_USE",
        "copies": 1,
        "effectId": "TARGET_DAMAGE_2_SELF_DAMAGE_2",
        "description": "Chọn 1 người chơi, người đó nhận 2 damage và bạn cũng nhận 2 damage."
      },
      {
        "id": "BLACK_DIABOLIC_RITUAL",
        "name": "Diabolic Ritual",
        "deck": "BLACK",
        "subtype": "SINGLE_USE",
        "copies": 1,
        "effectId": "SHADOW_FULL_HEAL",
        "description": "Nếu bạn là Shadow, có thể reveal và hồi toàn bộ damage về 0."
      },
      {
        "id": "BLACK_DYNAMITE",
        "name": "Dynamite",
        "deck": "BLACK",
        "subtype": "SINGLE_USE",
        "copies": 1,
        "effectId": "ROLL_2D6_DAMAGE_AREA_3",
        "description": "Roll 2d6. Nếu tổng tương ứng với 1 area, tất cả người chơi ở area đó nhận 3 damage. Nếu tổng là 7 thì không xảy ra gì."
      },
      {
        "id": "BLACK_MOODY_GOBLIN",
        "name": "Moody Goblin",
        "deck": "BLACK",
        "subtype": "SINGLE_USE",
        "copies": 2,
        "effectId": "STEAL_ONE_EQUIPMENT",
        "description": "Cướp 1 Equipment từ 1 người chơi bất kỳ."
      },
      {
        "id": "BLACK_SPIRITUAL_DOLL",
        "name": "Spiritual Doll",
        "deck": "BLACK",
        "subtype": "SINGLE_USE",
        "copies": 1,
        "effectId": "ROLL_D6_TARGET_OR_SELF_DAMAGE_3",
        "description": "Chọn 1 người chơi, roll 1d6. Nếu ra 1-4, mục tiêu nhận 3 damage. Nếu ra 5-6, bạn nhận 3 damage."
      },
      {
        "id": "BLACK_VAMPIRE_BAT",
        "name": "Vampire Bat",
        "deck": "BLACK",
        "subtype": "SINGLE_USE",
        "copies": 3,
        "effectId": "TARGET_DAMAGE_2_SELF_HEAL_1",
        "description": "Chọn 1 người chơi, gây 2 damage cho người đó và hồi 1 damage cho bạn."
      },
      {
        "id": "BLACK_BUTCHER_KNIFE",
        "name": "Butcher Knife",
        "deck": "BLACK",
        "subtype": "EQUIPMENT",
        "copies": 1,
        "effectId": "ADD_1_ATTACK_DAMAGE",
        "description": "Khi attack thành công, gây thêm 1 damage."
      },
      {
        "id": "BLACK_CHAINSAW",
        "name": "Chainsaw",
        "deck": "BLACK",
        "subtype": "EQUIPMENT",
        "copies": 1,
        "effectId": "ADD_1_ATTACK_DAMAGE",
        "description": "Khi attack thành công, gây thêm 1 damage."
      },
      {
        "id": "BLACK_RUSTED_BROAD_AXE",
        "name": "Rusted Broad Axe",
        "deck": "BLACK",
        "subtype": "EQUIPMENT",
        "copies": 1,
        "effectId": "ADD_1_ATTACK_DAMAGE",
        "description": "Khi attack thành công, gây thêm 1 damage."
      },
      {
        "id": "BLACK_HANDGUN",
        "name": "Handgun",
        "deck": "BLACK",
        "subtype": "EQUIPMENT",
        "copies": 1,
        "effectId": "ATTACK_ANY_AREA_EXCEPT_CURRENT",
        "description": "Bạn có thể attack người chơi ở bất kỳ area nào, trừ area hiện tại của bạn."
      },
      {
        "id": "BLACK_MACHINE_GUN",
        "name": "Machine Gun",
        "deck": "BLACK",
        "subtype": "EQUIPMENT",
        "copies": 1,
        "effectId": "ATTACK_ALL_TARGETS_IN_RANGE",
        "description": "Khi attack, bạn attack tất cả mục tiêu hợp lệ trong range. Roll damage 1 lần và áp dụng cho tất cả."
      },
      {
        "id": "BLACK_MASAMUNE",
        "name": "Masamune",
        "deck": "BLACK",
        "subtype": "EQUIPMENT",
        "copies": 1,
        "effectId": "MUST_ATTACK_DAMAGE_D4_NO_MISS",
        "description": "Nếu có thể attack thì bắt buộc attack. Damage bằng roll 1d4 và không miss."
      },
      {
        "id": "HERMIT_AID",
        "name": "Aid",
        "deck": "HERMIT",
        "subtype": "SINGLE_USE",
        "copies": 1,
        "effectId": "IF_HUNTER_HEAL_1_ELSE_IF_FULL_DAMAGE_1",
        "description": "Nếu người nhận là Hunter, hồi 1 damage. Nếu không phải Hunter và không có damage để hồi, nhận 1 damage."
      },
      {
        "id": "HERMIT_ANGER",
        "name": "Anger",
        "deck": "HERMIT",
        "subtype": "SINGLE_USE",
        "copies": 2,
        "effectId": "IF_HUNTER_OR_SHADOW_GIVE_EQUIPMENT_OR_DAMAGE_1",
        "description": "Nếu người nhận là Hunter hoặc Shadow, phải đưa 1 Equipment cho người rút card. Nếu không có Equipment, nhận 1 damage."
      },
      {
        "id": "HERMIT_BLACKMAIL",
        "name": "Blackmail",
        "deck": "HERMIT",
        "subtype": "SINGLE_USE",
        "copies": 2,
        "effectId": "IF_HUNTER_OR_NEUTRAL_GIVE_EQUIPMENT_OR_DAMAGE_1",
        "description": "Nếu người nhận là Hunter hoặc Neutral, phải đưa 1 Equipment cho người rút card. Nếu không có Equipment, nhận 1 damage."
      },
      {
        "id": "HERMIT_EXORCISM",
        "name": "Exorcism",
        "deck": "HERMIT",
        "subtype": "SINGLE_USE",
        "copies": 1,
        "effectId": "IF_SHADOW_DAMAGE_2",
        "description": "Nếu người nhận là Shadow, nhận 2 damage."
      },
      {
        "id": "HERMIT_GREED",
        "name": "Greed",
        "deck": "HERMIT",
        "subtype": "SINGLE_USE",
        "copies": 2,
        "effectId": "IF_NEUTRAL_OR_SHADOW_GIVE_EQUIPMENT_OR_DAMAGE_1",
        "description": "Nếu người nhận là Neutral hoặc Shadow, phải đưa 1 Equipment cho người rút card. Nếu không có Equipment, nhận 1 damage."
      },
      {
        "id": "HERMIT_HUDDLE",
        "name": "Huddle",
        "deck": "HERMIT",
        "subtype": "SINGLE_USE",
        "copies": 1,
        "effectId": "IF_SHADOW_HEAL_1_ELSE_IF_FULL_DAMAGE_1",
        "description": "Nếu người nhận là Shadow, hồi 1 damage. Nếu không phải Shadow và không có damage để hồi, nhận 1 damage."
      },
      {
        "id": "HERMIT_NURTURANCE",
        "name": "Nurturance",
        "deck": "HERMIT",
        "subtype": "SINGLE_USE",
        "copies": 1,
        "effectId": "IF_NEUTRAL_HEAL_1_ELSE_IF_FULL_DAMAGE_1",
        "description": "Nếu người nhận là Neutral, hồi 1 damage. Nếu không phải Neutral và không có damage để hồi, nhận 1 damage."
      },
      {
        "id": "HERMIT_PREDICTION",
        "name": "Prediction",
        "deck": "HERMIT",
        "subtype": "SINGLE_USE",
        "copies": 1,
        "effectId": "SHOW_CHARACTER_TO_CARD_OWNER",
        "description": "Người nhận bí mật cho người rút card xem Character Card của mình."
      },
      {
        "id": "HERMIT_SLAP",
        "name": "Slap",
        "deck": "HERMIT",
        "subtype": "SINGLE_USE",
        "copies": 2,
        "effectId": "IF_HUNTER_DAMAGE_1",
        "description": "Nếu người nhận là Hunter, nhận 1 damage."
      },
      {
        "id": "HERMIT_SPELL",
        "name": "Spell",
        "deck": "HERMIT",
        "subtype": "SINGLE_USE",
        "copies": 1,
        "effectId": "IF_SHADOW_DAMAGE_1",
        "description": "Nếu người nhận là Shadow, nhận 1 damage."
      },
      {
        "id": "HERMIT_BULLY",
        "name": "Bully",
        "deck": "HERMIT",
        "subtype": "SINGLE_USE",
        "copies": 1,
        "expansion": true,
        "effectId": "IF_LOW_HP_OR_NAME_GROUP_A_B_C_E_U_DAMAGE_1",
        "description": "Nếu người nhận thuộc nhóm nhân vật HP thấp hoặc tên nhóm A/B/C/E/U, nhận 1 damage."
      },
      {
        "id": "HERMIT_TOUGH_LESSON",
        "name": "Tough Lesson",
        "deck": "HERMIT",
        "subtype": "SINGLE_USE",
        "copies": 1,
        "expansion": true,
        "effectId": "IF_HIGH_HP_OR_NAME_GROUP_D_F_G_V_W_DAMAGE_2",
        "description": "Nếu người nhận thuộc nhóm nhân vật HP cao hoặc tên nhóm D/F/G/V/W, nhận 2 damage."
      }
    ],
    "globalWinConditions": {
      "HUNTER_WIN": "Tất cả Shadow chết.",
      "SHADOW_WIN": "Tất cả Hunter chết hoặc có ít nhất 3 Neutral chết.",
      "MULTIPLE_WINNERS": "Có thể có nhiều người cùng thắng nếu điều kiện thắng của họ được thỏa mãn cùng lúc."
    }
  }