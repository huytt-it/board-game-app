import type { BaseGameData } from '../player';
import type { RoomConfig, RoomGameState } from '../room';

// ─── Clocktower Roles ─────────────────────────────────────────────────
export enum ClocktowerRole {
  // Townsfolk
  Washerwoman = 'Washerwoman',
  Librarian = 'Librarian',
  Investigator = 'Investigator',
  Chef = 'Chef',
  Empath = 'Empath',
  FortuneTeller = 'Fortune Teller',
  Undertaker = 'Undertaker',
  Monk = 'Monk',
  Ravenkeeper = 'Ravenkeeper',
  Virgin = 'Virgin',
  Slayer = 'Slayer',
  Soldier = 'Soldier',
  Mayor = 'Mayor',

  // Outsiders
  Butler = 'Butler',
  Drunk = 'Drunk',
  Recluse = 'Recluse',
  Saint = 'Saint',

  // Minions
  Poisoner = 'Poisoner',
  Spy = 'Spy',
  ScarletWoman = 'Scarlet Woman',
  Baron = 'Baron',

  // Demons
  Imp = 'Imp',
}

// ─── Role Teams ───────────────────────────────────────────────────────
export type ClocktowerTeam = 'townsfolk' | 'outsider' | 'minion' | 'demon';

export const ROLE_TEAMS: Record<ClocktowerRole, ClocktowerTeam> = {
  [ClocktowerRole.Washerwoman]: 'townsfolk',
  [ClocktowerRole.Librarian]: 'townsfolk',
  [ClocktowerRole.Investigator]: 'townsfolk',
  [ClocktowerRole.Chef]: 'townsfolk',
  [ClocktowerRole.Empath]: 'townsfolk',
  [ClocktowerRole.FortuneTeller]: 'townsfolk',
  [ClocktowerRole.Undertaker]: 'townsfolk',
  [ClocktowerRole.Monk]: 'townsfolk',
  [ClocktowerRole.Ravenkeeper]: 'townsfolk',
  [ClocktowerRole.Virgin]: 'townsfolk',
  [ClocktowerRole.Slayer]: 'townsfolk',
  [ClocktowerRole.Soldier]: 'townsfolk',
  [ClocktowerRole.Mayor]: 'townsfolk',
  [ClocktowerRole.Butler]: 'outsider',
  [ClocktowerRole.Drunk]: 'outsider',
  [ClocktowerRole.Recluse]: 'outsider',
  [ClocktowerRole.Saint]: 'outsider',
  [ClocktowerRole.Poisoner]: 'minion',
  [ClocktowerRole.Spy]: 'minion',
  [ClocktowerRole.ScarletWoman]: 'minion',
  [ClocktowerRole.Baron]: 'minion',
  [ClocktowerRole.Imp]: 'demon',
};

// ─── Role Icons (unique per role) ─────────────────────────────────────
export const ROLE_ICONS: Record<ClocktowerRole, string> = {
  [ClocktowerRole.Washerwoman]: '🧺',
  [ClocktowerRole.Librarian]: '📚',
  [ClocktowerRole.Investigator]: '🔍',
  [ClocktowerRole.Chef]: '👨‍🍳',
  [ClocktowerRole.Empath]: '💗',
  [ClocktowerRole.FortuneTeller]: '🔮',
  [ClocktowerRole.Undertaker]: '⚰️',
  [ClocktowerRole.Monk]: '🛐',
  [ClocktowerRole.Ravenkeeper]: '🐦‍⬛',
  [ClocktowerRole.Virgin]: '👼',
  [ClocktowerRole.Slayer]: '⚔️',
  [ClocktowerRole.Soldier]: '🛡️',
  [ClocktowerRole.Mayor]: '👑',
  [ClocktowerRole.Butler]: '🎩',
  [ClocktowerRole.Drunk]: '🍺',
  [ClocktowerRole.Recluse]: '🏚️',
  [ClocktowerRole.Saint]: '✝️',
  [ClocktowerRole.Poisoner]: '☠️',
  [ClocktowerRole.Spy]: '🕵️',
  [ClocktowerRole.ScarletWoman]: '💃',
  [ClocktowerRole.Baron]: '🎪',
  [ClocktowerRole.Imp]: '👹',
};

// ─── Role Short Descriptions ──────────────────────────────────────────
export const ROLE_SHORT_DESC: Record<ClocktowerRole, string> = {
  [ClocktowerRole.Washerwoman]: 'Knows 1 of 2 players is a Townsfolk',
  [ClocktowerRole.Librarian]: 'Knows 1 of 2 players is an Outsider',
  [ClocktowerRole.Investigator]: 'Knows 1 of 2 players is a Minion',
  [ClocktowerRole.Chef]: 'Knows how many evil pairs exist',
  [ClocktowerRole.Empath]: 'Learns evil neighbour count each night',
  [ClocktowerRole.FortuneTeller]: 'Picks 2 players to detect Demon',
  [ClocktowerRole.Undertaker]: 'Learns who was executed today',
  [ClocktowerRole.Monk]: 'Protects a player from the Demon',
  [ClocktowerRole.Ravenkeeper]: 'On death, learns a player\'s role',
  [ClocktowerRole.Virgin]: 'First nominator (Townsfolk) dies',
  [ClocktowerRole.Slayer]: 'Once per game, try to slay the Demon',
  [ClocktowerRole.Soldier]: 'Cannot be killed by the Demon',
  [ClocktowerRole.Mayor]: 'If 3 alive & no execution, Good wins',
  [ClocktowerRole.Butler]: 'Must follow a master\'s vote',
  [ClocktowerRole.Drunk]: 'Thinks they\'re a Townsfolk (but isn\'t)',
  [ClocktowerRole.Recluse]: 'May register as evil',
  [ClocktowerRole.Saint]: 'If executed, Evil wins',
  [ClocktowerRole.Poisoner]: 'Poisons a player each night',
  [ClocktowerRole.Spy]: 'Sees the Grimoire each night',
  [ClocktowerRole.ScarletWoman]: 'Becomes Demon if Demon dies',
  [ClocktowerRole.Baron]: 'Adds 2 extra Outsiders',
  [ClocktowerRole.Imp]: 'Kills a player each night',
};

// ─── Roles that have night actions ────────────────────────────────────
// Night 1 (Dusk): Poisoner acts first, then information roles, then Spy
export const FIRST_NIGHT_ROLES: ClocktowerRole[] = [
  ClocktowerRole.Poisoner,
  ClocktowerRole.Washerwoman,
  ClocktowerRole.Librarian,
  ClocktowerRole.Investigator,
  ClocktowerRole.Chef,
  ClocktowerRole.Empath,
  ClocktowerRole.FortuneTeller,
  ClocktowerRole.Butler,
  ClocktowerRole.Spy,
  // Imp does NOT act on night 1
  // Ravenkeeper only triggers on the night they are killed — NOT a regular nightly action
];

// Night 2+ (official Trouble Brewing order)
export const OTHER_NIGHT_ROLES: ClocktowerRole[] = [
  ClocktowerRole.Poisoner,   // poisons first so victims get bad info this night
  ClocktowerRole.Monk,       // protects before Imp kills
  ClocktowerRole.Imp,        // kills
  // Ravenkeeper triggers here IF they were killed — handled manually by host via direct message
  ClocktowerRole.Empath,
  ClocktowerRole.FortuneTeller,
  ClocktowerRole.Undertaker,
  ClocktowerRole.Butler,
  ClocktowerRole.Spy,
  // ScarletWoman is passive — triggers automatically if Imp dies (host handles)
];

// ─── Role Ability Descriptions ────────────────────────────────────────
export const ROLE_ABILITIES: Record<ClocktowerRole, string> = {
  [ClocktowerRole.Washerwoman]: 'You start knowing that 1 of 2 players is a particular Townsfolk.',
  [ClocktowerRole.Librarian]: 'You start knowing that 1 of 2 players is a particular Outsider. (Or that zero are in play.)',
  [ClocktowerRole.Investigator]: 'You start knowing that 1 of 2 players is a particular Minion.',
  [ClocktowerRole.Chef]: 'You start knowing how many pairs of evil players there are.',
  [ClocktowerRole.Empath]: 'Each night, you learn how many of your 2 alive neighbours are evil.',
  [ClocktowerRole.FortuneTeller]: 'Each night, choose 2 players: you learn if either is the Demon. (There is a good player that registers as the Demon to you.)',
  [ClocktowerRole.Undertaker]: 'Each night*, you learn which character died by execution today.',
  [ClocktowerRole.Monk]: 'Each night*, choose a player (not yourself): they are safe from the Demon tonight.',
  [ClocktowerRole.Ravenkeeper]: 'If you die at night, you are woken to choose a player: you learn their character.',
  [ClocktowerRole.Virgin]: 'The 1st time you are nominated, if the nominator is a Townsfolk, they are executed immediately.',
  [ClocktowerRole.Slayer]: 'Once per game, during the day, publicly choose a player: if they are the Demon, they die.',
  [ClocktowerRole.Soldier]: 'You are safe from the Demon.',
  [ClocktowerRole.Mayor]: 'If only 3 players live & no execution occurs, your team wins. If you die at night, another player might die instead.',
  [ClocktowerRole.Butler]: 'Each night, choose a player (not yourself): tomorrow, you may only vote if they are voting too.',
  [ClocktowerRole.Drunk]: 'You do not know you are the Drunk. You think you are a Townsfolk character, but you are not.',
  [ClocktowerRole.Recluse]: 'You might register as evil & as a Minion or Demon, even if dead.',
  [ClocktowerRole.Saint]: 'If you die by execution, your team loses.',
  [ClocktowerRole.Poisoner]: 'Each night, choose a player: they are poisoned tonight and tomorrow day.',
  [ClocktowerRole.Spy]: 'Each night, you see the Grimoire. You might register as good & as a Townsfolk or Outsider, even if dead.',
  [ClocktowerRole.ScarletWoman]: 'If there are 5 or more players alive & the Demon dies, you become the Demon. (Travellers don\'t count.)',
  [ClocktowerRole.Baron]: 'There are extra Outsiders in play. [+2 Outsiders]',
  [ClocktowerRole.Imp]: 'Each night*, choose a player: they die. If you kill yourself this way, a Minion becomes the Imp.',
};

// ─── Role Action Types ────────────────────────────────────────────────
// 'info-only'     : Player waits; host auto-computes & sends info (no target picked)
// 'single-target' : Player picks 1 other player
// 'dual-target'   : Player picks 2 players (Fortune Teller)
// 'self-or-other' : Player picks any player including themselves (Imp)
// 'no-action'     : No night action for this role
export type RoleActionType = 'info-only' | 'single-target' | 'dual-target' | 'no-action' | 'self-or-other';

export const ROLE_ACTION_TYPE: Record<ClocktowerRole, RoleActionType> = {
  [ClocktowerRole.Washerwoman]: 'info-only',
  [ClocktowerRole.Librarian]: 'info-only',
  [ClocktowerRole.Investigator]: 'info-only',
  [ClocktowerRole.Chef]: 'info-only',
  [ClocktowerRole.Empath]: 'info-only',
  [ClocktowerRole.FortuneTeller]: 'dual-target',
  [ClocktowerRole.Undertaker]: 'info-only',
  [ClocktowerRole.Monk]: 'single-target',
  [ClocktowerRole.Ravenkeeper]: 'single-target',
  [ClocktowerRole.Virgin]: 'no-action',
  [ClocktowerRole.Slayer]: 'no-action',
  [ClocktowerRole.Soldier]: 'no-action',
  [ClocktowerRole.Mayor]: 'no-action',
  [ClocktowerRole.Butler]: 'single-target',
  [ClocktowerRole.Drunk]: 'no-action',
  [ClocktowerRole.Recluse]: 'no-action',
  [ClocktowerRole.Saint]: 'no-action',
  [ClocktowerRole.Poisoner]: 'single-target',
  [ClocktowerRole.Spy]: 'info-only',
  [ClocktowerRole.ScarletWoman]: 'no-action',
  [ClocktowerRole.Baron]: 'no-action',
  [ClocktowerRole.Imp]: 'self-or-other',
};

// ─── Night action instructions shown to the player ───────────────────
export const ROLE_NIGHT_INSTRUCTIONS: Partial<Record<ClocktowerRole, string>> = {
  [ClocktowerRole.Washerwoman]: 'Quản trò sẽ cho bạn biết 2 người chơi, trong đó 1 người là Townsfolk cụ thể.',
  [ClocktowerRole.Librarian]: 'Quản trò sẽ cho bạn biết 2 người chơi, trong đó 1 người là Outsider cụ thể.',
  [ClocktowerRole.Investigator]: 'Quản trò sẽ cho bạn biết 2 người chơi, trong đó 1 người là Minion cụ thể.',
  [ClocktowerRole.Chef]: 'Quản trò sẽ cho bạn biết có bao nhiêu cặp người ác ngồi cạnh nhau.',
  [ClocktowerRole.Empath]: 'Quản trò sẽ cho bạn biết số hàng xóm còn sống gần bạn nhất là ác (0, 1 hoặc 2).',
  [ClocktowerRole.FortuneTeller]: 'Chọn 2 người chơi. Quản trò sẽ cho bạn biết liệu một trong hai có phải là Quỷ không.',
  [ClocktowerRole.Undertaker]: 'Quản trò sẽ cho bạn biết nhân vật của người đã bị xử tử hôm nay.',
  [ClocktowerRole.Monk]: 'Chọn 1 người chơi để bảo vệ họ khỏi Quỷ đêm nay. Không thể chọn bản thân.',
  [ClocktowerRole.Ravenkeeper]: 'Bạn vừa qua đời! Chọn 1 người chơi để biết nhân vật của họ.',
  [ClocktowerRole.Butler]: 'Chọn 1 người chơi làm chủ. Ngày mai bạn chỉ được bỏ phiếu nếu người đó bỏ phiếu trước.',
  [ClocktowerRole.Poisoner]: 'Chọn 1 người chơi để đầu độc đêm nay. Họ sẽ nhận thông tin sai từ Quản trò.',
  [ClocktowerRole.Spy]: 'Quản trò sẽ cho bạn xem Grimoire — danh sách nhân vật của tất cả mọi người.',
  [ClocktowerRole.Imp]: 'Chọn 1 người chơi để giết đêm nay. Chọn chính mình để truyền vai Imp cho một Minion ngẫu nhiên.',
};

// ─── Vietnamese Role Names ────────────────────────────────────────────
export const ROLE_NAMES_VI: Record<ClocktowerRole, string> = {
  [ClocktowerRole.Washerwoman]: 'Người Giặt Đồ',
  [ClocktowerRole.Librarian]: 'Thủ Thư',
  [ClocktowerRole.Investigator]: 'Thám Tử',
  [ClocktowerRole.Chef]: 'Đầu Bếp',
  [ClocktowerRole.Empath]: 'Người Thấu Cảm',
  [ClocktowerRole.FortuneTeller]: 'Thầy Bói',
  [ClocktowerRole.Undertaker]: 'Người Chôn Xác',
  [ClocktowerRole.Monk]: 'Tu Sĩ',
  [ClocktowerRole.Ravenkeeper]: 'Người Nuôi Quạ',
  [ClocktowerRole.Virgin]: 'Trinh Nữ',
  [ClocktowerRole.Slayer]: 'Thợ Săn Quỷ',
  [ClocktowerRole.Soldier]: 'Chiến Binh',
  [ClocktowerRole.Mayor]: 'Thị Trưởng',
  [ClocktowerRole.Butler]: 'Quản Gia',
  [ClocktowerRole.Drunk]: 'Kẻ Say Rượu',
  [ClocktowerRole.Recluse]: 'Ẩn Sĩ',
  [ClocktowerRole.Saint]: 'Thánh Nhân',
  [ClocktowerRole.Poisoner]: 'Kẻ Đầu Độc',
  [ClocktowerRole.Spy]: 'Gián Điệp',
  [ClocktowerRole.ScarletWoman]: 'Hồng Y Phu Nhân',
  [ClocktowerRole.Baron]: 'Nam Tước',
  [ClocktowerRole.Imp]: 'Quỷ Con',
};

// ─── Vietnamese Team Names ────────────────────────────────────────────
export const ROLE_TEAM_VI: Record<ClocktowerTeam, string> = {
  townsfolk: 'Dân Làng',
  outsider: 'Ngoại Nhân',
  minion: 'Tay Sai',
  demon: 'Quỷ Dữ',
};

// ─── Full Vietnamese Descriptions ────────────────────────────────────
export const ROLE_FULL_DESC_VI: Record<ClocktowerRole, string> = {
  [ClocktowerRole.Washerwoman]: 'Đêm đầu tiên, Quản trò cho bạn biết tên 2 người chơi và xác nhận 1 trong số đó là một Townsfolk cụ thể. Thông tin có thể sai nếu bạn bị đầu độc hoặc là Kẻ Say Rượu.',
  [ClocktowerRole.Librarian]: 'Đêm đầu tiên, Quản trò cho bạn biết tên 2 người chơi và xác nhận 1 trong số đó là một Outsider cụ thể. Nếu không có Outsider trong ván, bạn sẽ biết điều đó ngay từ đầu.',
  [ClocktowerRole.Investigator]: 'Đêm đầu tiên, Quản trò cho bạn biết tên 2 người chơi và xác nhận 1 trong số đó là một Minion cụ thể. Recluse và Spy có thể làm nhiễu kết quả của bạn.',
  [ClocktowerRole.Chef]: 'Đêm đầu tiên, Quản trò cho bạn biết có bao nhiêu cặp người ác ngồi cạnh nhau theo vòng tròn. Số 0 = ác không ngồi liền kề; số cao = ác tập trung.',
  [ClocktowerRole.Empath]: 'Mỗi đêm bạn được cho biết trong 2 hàng xóm còn sống gần nhất (trái và phải) có bao nhiêu người là phe ác. Con số này cập nhật theo từng đêm khi có người chết.',
  [ClocktowerRole.FortuneTeller]: 'Mỗi đêm bạn chọn 2 người chơi. Quản trò trả lời "CÓ" nếu 1 trong 2 là Quỷ, "KHÔNG" nếu không. Lưu ý: luôn có 1 người thiện đặc biệt đăng ký như Quỷ với bạn (mồi nhử), làm phức tạp thêm thông tin.',
  [ClocktowerRole.Undertaker]: 'Mỗi đêm từ đêm 2, nếu hôm nay có ai bị xử tử, Quản trò cho bạn biết nhân vật thật của người đó. Không có xử tử = không có thông tin đêm đó.',
  [ClocktowerRole.Monk]: 'Mỗi đêm từ đêm 2, bạn chọn 1 người chơi khác (không phải bản thân) để bảo vệ họ khỏi đòn tấn công của Quỷ trong đêm đó.',
  [ClocktowerRole.Ravenkeeper]: 'Nếu bạn bị Quỷ giết trong đêm, trước khi chết bạn được chọn 1 người chơi và Quản trò tiết lộ nhân vật thật của người đó cho bạn. Thông tin này cực kỳ giá trị — hãy chia sẻ vào ngày hôm sau.',
  [ClocktowerRole.Virgin]: 'Kỹ năng kích hoạt 1 lần: Lần đầu tiên bạn bị đề cử, nếu người đề cử là một Townsfolk thật sự, họ bị xử tử ngay lập tức! Đây là bẫy lọc người ác dám đề cử bạn.',
  [ClocktowerRole.Slayer]: 'Một lần duy nhất trong cả ván, bạn công khai tuyên bố nhắm vào 1 người chơi. Nếu người đó là Quỷ — họ chết ngay! Nếu không, không có gì xảy ra. Hãy dùng sau khi có đủ thông tin.',
  [ClocktowerRole.Soldier]: 'Bạn hoàn toàn miễn nhiễm với đòn tấn công của Quỷ vào ban đêm. Quỷ không thể giết bạn dù có cố bao nhiêu lần.',
  [ClocktowerRole.Mayor]: 'Nếu còn đúng 3 người sống và ngày hôm đó không có ai bị xử tử, phe Thiện thắng ngay! Ngoài ra, khi Quỷ tấn công bạn vào đêm, Quản trò có thể chuyển cái chết sang người khác.',
  [ClocktowerRole.Butler]: 'Mỗi đêm bạn chọn 1 người làm "chủ". Ngày hôm sau bạn chỉ được bỏ phiếu xử tử nếu người chủ đó bỏ phiếu trước bạn. Không thể chọn bản thân làm chủ.',
  [ClocktowerRole.Drunk]: 'Bạn không biết mình là Kẻ Say Rượu. Bạn nghĩ mình là một Townsfolk khác, nhưng không có khả năng gì. Mọi thông tin Quản trò đưa cho bạn đều là thông tin giả.',
  [ClocktowerRole.Recluse]: 'Bạn có thể được Quản trò đối xử như người ác trong một số tình huống — Thám Tử có thể chỉ điểm bạn là Minion, Thầy Bói có thể nhận "CÓ" khi chọn bạn. Điều này tạo ra thông tin sai lệch tự nhiên.',
  [ClocktowerRole.Saint]: 'Nếu làng xử tử bạn bằng bỏ phiếu đa số, phe Ác thắng ngay lập tức! Nhiệm vụ của bạn là tồn tại và tránh bị xử tử suốt ván đấu.',
  [ClocktowerRole.Poisoner]: 'Mỗi đêm bạn chọn 1 người để đầu độc. Người đó nhận thông tin giả từ Quản trò trong đêm đó và cả ngày hôm sau. Đây là vũ khí gây nhiễu thông tin mạnh nhất của phe Ác.',
  [ClocktowerRole.Spy]: 'Mỗi đêm bạn được xem toàn bộ Grimoire — biết nhân vật thật và trạng thái của tất cả mọi người. Bạn cũng có thể được Quản trò đối xử như người thiện trong một số tình huống.',
  [ClocktowerRole.ScarletWoman]: 'Kỹ năng thụ động: Nếu Quỷ bị giết khi còn ít nhất 5 người sống, bạn ngay lập tức trở thành Quỷ mới! Phe Ác tiếp tục chiến đấu. Nhiệm vụ của bạn là tồn tại và ẩn náu.',
  [ClocktowerRole.Baron]: 'Kỹ năng thụ động từ đầu ván: Thêm 2 Outsider vào ván đấu (và bớt đi 2 Townsfolk tương ứng). Điều này đẩy thêm Outsider nguy hiểm vào làng ngay từ đầu.',
  [ClocktowerRole.Imp]: 'Mỗi đêm từ đêm 2, bạn chọn 1 người để giết. Nếu bạn tự chọn mình, bạn "truyền ngôi" — một Minion ngẫu nhiên còn sống trở thành Quỷ Con mới, còn bạn chết như một chiến thuật rút lui.',
};

// ─── Vietnamese Gameplay Tips ─────────────────────────────────────────
export const ROLE_TIPS_VI: Record<ClocktowerRole, string[]> = {
  [ClocktowerRole.Washerwoman]: [
    'Chia sẻ thông tin ngay ngày đầu để xây dựng niềm tin với làng.',
    'Kết hợp với Chef và Empath để xác nhận thông tin lẫn nhau.',
    'Nếu thông tin mâu thuẫn với thực tế, bạn có thể đang bị đầu độc.',
  ],
  [ClocktowerRole.Librarian]: [
    'Nếu biết có Saint hoặc Drunk, hãy chia sẻ ngay để làng thận trọng.',
    'Không có Outsider là thông tin quan trọng — hãy khai ngay từ đầu.',
    'Kết hợp với Washerwoman để cùng thu hẹp danh sách nghi ngờ.',
  ],
  [ClocktowerRole.Investigator]: [
    'Thông tin về Minion rất quý giá — hãy chia sẻ cẩn thận, không vội vàng.',
    'Recluse và Spy có thể làm nhiễu kết quả — hãy tính đến khả năng này.',
    'Kết hợp với người có thông tin khác để loại trừ dần.',
  ],
  [ClocktowerRole.Chef]: [
    'Số 0: ác không ngồi cạnh nhau — Spy có thể là nguyên nhân làm số này sai.',
    'Số cao: ác tập trung thành cụm — hãy tìm nhóm người đáng ngờ.',
    'Kết hợp với Empath để vẽ bản đồ phân bố phe ác.',
  ],
  [ClocktowerRole.Empath]: [
    'Theo dõi sự thay đổi con số qua mỗi đêm khi người chết đi để rút ra manh mối.',
    'Nếu số tăng sau khi ai đó chết — người đó có thể đã là người thiện.',
    'Ghi nhớ vị trí ngồi của mình để tính toán chính xác hàng xóm nào.',
  ],
  [ClocktowerRole.FortuneTeller]: [
    'Luôn nhớ có 1 mồi nhử — người đầu tiên báo "CÓ" chưa chắc là Quỷ.',
    'Chọn nhiều người khác nhau qua nhiều đêm để thu hẹp dần khả năng.',
    'Nếu 1 người liên tục báo "CÓ" khi ghép với người khác — họ có thể là mồi nhử.',
  ],
  [ClocktowerRole.Undertaker]: [
    'Thông tin của bạn xác nhận chắc chắn nhân vật người đã bị xử tử.',
    'Chia sẻ ngay khi cần — thông tin xác nhận thường rất có giá trị.',
    'Nếu bị đầu độc, thông tin bạn nhận sẽ sai — hãy cẩn thận.',
  ],
  [ClocktowerRole.Monk]: [
    'Ưu tiên bảo vệ người mang thông tin quan trọng như Empath, Undertaker, FT.',
    'Đừng bảo vệ cùng 1 người mỗi đêm — Quỷ sẽ đổi mục tiêu sang người khác.',
    'Đôi khi hãy bảo vệ chính người bạn nghi là mục tiêu của Quỷ đêm đó.',
  ],
  [ClocktowerRole.Ravenkeeper]: [
    'Khi chết, hãy chọn người bạn nghi ngờ nhất — thông tin thu được rất quý.',
    'Hãy chia sẻ thông tin bạn thu được vào ngày hôm sau trước khi bị xử tử.',
    'Nếu thấy mình sắp bị xử tử ban ngày, hãy khai thông tin còn bạn có thể.',
  ],
  [ClocktowerRole.Virgin]: [
    'Khai ra bạn là Virgin sớm để bẫy người ác nếu họ liều lĩnh đề cử bạn.',
    'Người đề cử bạn có thể là Recluse hoặc Outsider — họ sẽ không chết.',
    'Đừng sợ bị đề cử — đó chính là cơ chế giúp làng lọc người ác.',
  ],
  [ClocktowerRole.Slayer]: [
    'Đừng dùng kỹ năng vội — hãy thu thập đủ thông tin qua nhiều ngày trước.',
    'Kết hợp với FT và Empath để xác định mục tiêu chính xác nhất.',
    'Tuyên bố "Tôi là Slayer và tôi nghi X" cũng tạo áp lực dù chưa dùng kỹ năng.',
  ],
  [ClocktowerRole.Soldier]: [
    'Khai ra bạn là Soldier để Quỷ lãng phí lượt tấn công vào bạn đêm đó.',
    'Hoặc giữ bí mật để Quỷ mất lượt mà không biết — bạn vẫn sống qua đêm.',
    'Hãy sống sót đến cùng để bỏ phiếu quyết định vào những ngày cuối.',
  ],
  [ClocktowerRole.Mayor]: [
    'Mục tiêu chính: kéo dài ván đấu đến khi chỉ còn đúng 3 người sống và không có xử tử.',
    'Hợp tác với Monk để được bảo vệ trong những đêm cuối quan trọng.',
    'Đừng khai ra quá sớm — phe ác sẽ tập trung bỏ phiếu xử tử bạn.',
  ],
  [ClocktowerRole.Butler]: [
    'Chọn người bạn tin tưởng nhất và quan sát hành động bỏ phiếu của họ mỗi ngày.',
    'Đừng quên theo dõi khi nào chủ bỏ phiếu để kịp bỏ theo trước khi hết thời gian.',
    'Nếu nghi ngờ chủ là người ác, hãy đổi chủ vào đêm hôm sau.',
  ],
  [ClocktowerRole.Drunk]: [
    'Bạn không biết mình say — hãy chơi bình thường như vai trò bạn nghĩ bạn đang có.',
    'Thông tin bạn nhận đêm qua là thông tin giả, nhưng bạn không thể biết điều đó.',
    'Thử thách thú vị: khi nào bạn mới bắt đầu nghi ngờ thông tin của mình bị sai?',
  ],
  [ClocktowerRole.Recluse]: [
    'Bạn có thể giả vờ là một Townsfolk để tránh bị làng nghi ngờ và xử tử.',
    'Khả năng đăng ký như ác tự nhiên tạo ra thông tin sai lệch giúp phe ác gián tiếp.',
    'Hãy cố gắng tồn tại lâu nhất vì sự xuất hiện của bạn làm nhiễu loạn thông tin.',
  ],
  [ClocktowerRole.Saint]: [
    'Nhiệm vụ số 1: đừng bị xử tử! Thuyết phục mọi người bạn không phải mối đe dọa.',
    'Đừng khai ra bạn là Saint quá sớm — phe ác sẽ tìm cách vận động xử tử bạn.',
    'Nếu bị đề cử nhiều lần, hãy cân nhắc khai ra để làng không dám bỏ phiếu tiến hành.',
  ],
  [ClocktowerRole.Poisoner]: [
    'Ưu tiên đầu độc Empath, Thầy Bói, Undertaker — những người mang thông tin quan trọng.',
    'Đầu độc Virgin trước khi có ai đề cử họ để tránh cơ chế bẫy của Virgin.',
    'Xây dựng vỏ bọc thiện lành và ủng hộ người thiện để che giấu bản thân.',
  ],
  [ClocktowerRole.Spy]: [
    'Bạn biết tất cả — hãy dùng thông tin đó để vận động làng xử tử người thiện quan trọng.',
    'Có thể đăng ký như Townsfolk với một số vai trò — hãy tận dụng để tạo vỏ bọc.',
    'Chia sẻ một phần thông tin thật để tạo niềm tin, rồi phản bội vào thời điểm quyết định.',
  ],
  [ClocktowerRole.ScarletWoman]: [
    'Tồn tại là nhiệm vụ tối thượng — đừng để bị xử tử dù bằng bất kỳ cách nào.',
    'Hợp tác bí mật với Imp — khi Imp bị lộ, Imp có thể tự giết để bạn trở thành Quỷ mới.',
    'Xây dựng vỏ bọc Townsfolk tốt ngay từ đầu ván để làng không bao giờ nghi bạn.',
  ],
  [ClocktowerRole.Baron]: [
    'Bạn không có hành động đêm — hãy tập trung vào thao túng và vận động trong ngày.',
    'Bạn biết ai là Outsider trong ván (do bạn đưa vào) — hãy bảo vệ những đồng minh đó.',
    'Hành xử như một Townsfolk bình thường, tránh để lộ bất kỳ dấu hiệu nào.',
  ],
  [ClocktowerRole.Imp]: [
    'Ưu tiên giết người thu thập thông tin quan trọng: Empath, Thầy Bói, Undertaker.',
    'Khi bị lộ và khó thoát, hãy tự giết để truyền ngôi cho Minion — phe ác tiếp tục.',
    'Điều phối bí mật với Poisoner để đảm bảo thông tin của làng luôn bị nhiễu loạn.',
  ],
};

// ─── Role Trait Types ─────────────────────────────────────────────────
// When a role's night action fires
export type RoleNightTiming =
  | 'first-night-only'  // Đêm đầu tiên (Washerwoman, Chef…)
  | 'every-night'       // Mỗi đêm (Empath, Poisoner…)
  | 'after-first-night' // Sau đêm đầu tiên (Monk, Imp, Undertaker…)
  | 'triggered'         // Khi bị giết vào ban đêm (Ravenkeeper)
  | 'day-ability'       // Kỹ năng ban ngày (Virgin, Slayer)
  | 'no-night';         // Không có hành động đêm (Soldier, Baron…)

// The nature of the role's ability
export type RoleSkillType =
  | 'info'    // Lấy thông tin — receives information from ST
  | 'active'  // Kỹ năng chủ động — player chooses a target each night/day
  | 'passive' // Kỹ năng bị động — always-on effect, no player decision
  | 'special' // Kỹ năng đặc biệt — unique trigger or conditional
  | 'setup';  // Thiết lập ván — changes the game composition at start

export interface RoleTraits {
  timing: RoleNightTiming;
  skillTypes: RoleSkillType[];
}

export const ROLE_TRAITS: Record<ClocktowerRole, RoleTraits> = {
  [ClocktowerRole.Washerwoman]: { timing: 'first-night-only', skillTypes: ['info'] },
  [ClocktowerRole.Librarian]:   { timing: 'first-night-only', skillTypes: ['info'] },
  [ClocktowerRole.Investigator]:{ timing: 'first-night-only', skillTypes: ['info'] },
  [ClocktowerRole.Chef]:        { timing: 'first-night-only', skillTypes: ['info'] },
  [ClocktowerRole.Empath]:      { timing: 'every-night',       skillTypes: ['info'] },
  [ClocktowerRole.FortuneTeller]:{ timing: 'every-night',      skillTypes: ['active', 'info'] },
  [ClocktowerRole.Undertaker]:  { timing: 'after-first-night', skillTypes: ['info'] },
  [ClocktowerRole.Monk]:        { timing: 'after-first-night', skillTypes: ['active'] },
  [ClocktowerRole.Ravenkeeper]: { timing: 'triggered',         skillTypes: ['special'] },
  [ClocktowerRole.Virgin]:      { timing: 'day-ability',       skillTypes: ['special'] },
  [ClocktowerRole.Slayer]:      { timing: 'day-ability',       skillTypes: ['active'] },
  [ClocktowerRole.Soldier]:     { timing: 'no-night',          skillTypes: ['passive'] },
  [ClocktowerRole.Mayor]:       { timing: 'no-night',          skillTypes: ['passive', 'special'] },
  [ClocktowerRole.Butler]:      { timing: 'every-night',       skillTypes: ['active'] },
  [ClocktowerRole.Drunk]:       { timing: 'no-night',          skillTypes: ['special'] },
  [ClocktowerRole.Recluse]:     { timing: 'no-night',          skillTypes: ['passive'] },
  [ClocktowerRole.Saint]:       { timing: 'no-night',          skillTypes: ['passive'] },
  [ClocktowerRole.Poisoner]:    { timing: 'every-night',       skillTypes: ['active'] },
  [ClocktowerRole.Spy]:         { timing: 'every-night',       skillTypes: ['active', 'info'] },
  [ClocktowerRole.ScarletWoman]:{ timing: 'no-night',          skillTypes: ['passive'] },
  [ClocktowerRole.Baron]:       { timing: 'no-night',          skillTypes: ['setup'] },
  [ClocktowerRole.Imp]:         { timing: 'after-first-night', skillTypes: ['active'] },
};

// ─── Display labels for role traits ──────────────────────────────────
export const NIGHT_TIMING_DISPLAY: Record<RoleNightTiming, { label: string; icon: string; className: string }> = {
  'first-night-only':  { label: 'Đêm đầu tiên',         icon: '🌙', className: 'text-indigo-300 bg-indigo-500/15 border-indigo-500/30' },
  'every-night':       { label: 'Mỗi đêm',               icon: '🔄', className: 'text-blue-300   bg-blue-500/15   border-blue-500/30'   },
  'after-first-night': { label: 'Sau đêm đầu tiên',      icon: '⏭️', className: 'text-cyan-300   bg-cyan-500/15   border-cyan-500/30'   },
  'triggered':         { label: 'Khi bị giết',            icon: '⚡', className: 'text-yellow-300 bg-yellow-500/15 border-yellow-500/30' },
  'day-ability':       { label: 'Kỹ năng ban ngày',       icon: '☀️', className: 'text-amber-300  bg-amber-500/15  border-amber-500/30'  },
  'no-night':          { label: 'Không hành động đêm',    icon: '💤', className: 'text-slate-400  bg-slate-500/15  border-slate-500/30'  },
};

export const SKILL_TYPE_DISPLAY: Record<RoleSkillType, { label: string; icon: string; className: string }> = {
  'info':    { label: 'Lấy thông tin',   icon: '🔍', className: 'text-green-300  bg-green-500/15  border-green-500/30'  },
  'active':  { label: 'Chủ động',        icon: '✋', className: 'text-purple-300 bg-purple-500/15 border-purple-500/30' },
  'passive': { label: 'Bị động',         icon: '🛡️', className: 'text-slate-300  bg-slate-500/15  border-slate-500/30'  },
  'special': { label: 'Đặc biệt',        icon: '⭐', className: 'text-orange-300 bg-orange-500/15 border-orange-500/30' },
  'setup':   { label: 'Thiết lập ván',   icon: '⚙️', className: 'text-pink-300   bg-pink-500/15   border-pink-500/30'   },
};

// ─── Clocktower-Specific Game State ───────────────────────────────────
// Extends RoomGameState — use this type in all Clocktower components instead
// of RoomGameState so the intent is clear and the type can diverge later.
export type ClocktowerGameState = RoomGameState;

// ─── Clocktower-Specific Game Data ────────────────────────────────────
export interface ClocktowerGameData extends BaseGameData {
  role: ClocktowerRole;
  team: ClocktowerTeam;
  isPoisoned: boolean;
  isDrunk: boolean;
  drunkRole?: ClocktowerRole;          // Fake role the Drunk believes they are
  fortuneTellerRedHerring?: string;    // PlayerId of the good player who registers as Demon to FT
  hasUsedAbility: boolean;
  nightOrder: number;
  privateMessage?: string;
}

// ─── Clocktower Room Config ───────────────────────────────────────────
export interface ClocktowerConfig extends RoomConfig {
  edition: 'trouble-brewing' | 'bad-moon-rising' | 'sects-and-violets';
  townsfolkCount: number;
  outsiderCount: number;
  minionCount: number;
  demonCount: number;
}

// ─── Night Action specific to Clocktower ──────────────────────────────
export interface ClocktowerNightAction {
  playerId: string;
  playerName: string;
  role: ClocktowerRole;
  targetId: string;
  targetName: string;
  abilityDescription: string;
}
