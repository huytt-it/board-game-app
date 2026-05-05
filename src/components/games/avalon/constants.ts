import { AvalonRole, type AvalonTeam } from './types';

export const ROLE_TEAM: Record<AvalonRole, AvalonTeam> = {
  [AvalonRole.Merlin]: 'good',
  [AvalonRole.Percival]: 'good',
  [AvalonRole.LoyalServant]: 'good',
  [AvalonRole.Mordred]: 'evil',
  [AvalonRole.Morgana]: 'evil',
  [AvalonRole.Oberon]: 'evil',
  [AvalonRole.Assassin]: 'evil',
  [AvalonRole.Minion]: 'evil',
};

export const ROLE_ICONS: Record<AvalonRole, string> = {
  [AvalonRole.Merlin]: '🧙',
  [AvalonRole.Percival]: '🛡️',
  [AvalonRole.LoyalServant]: '⚔️',
  [AvalonRole.Mordred]: '👑',
  [AvalonRole.Morgana]: '🔮',
  [AvalonRole.Oberon]: '🦉',
  [AvalonRole.Assassin]: '🗡️',
  [AvalonRole.Minion]: '🐍',
};

export const ROLE_NAMES_VI: Record<AvalonRole, string> = {
  [AvalonRole.Merlin]: 'Pháp Sư Merlin',
  [AvalonRole.Percival]: 'Hiệp Sĩ Percival',
  [AvalonRole.LoyalServant]: 'Trung Thần của Arthur',
  [AvalonRole.Mordred]: 'Tà Vương Mordred',
  [AvalonRole.Morgana]: 'Phù Thuỷ Morgana',
  [AvalonRole.Oberon]: 'Bóng Tối Oberon',
  [AvalonRole.Assassin]: 'Sát Thủ',
  [AvalonRole.Minion]: 'Tay Sai của Mordred',
};

export const ROLE_DESC_VI: Record<AvalonRole, string> = {
  [AvalonRole.Merlin]:
    'Bạn biết tất cả tay sai của Phe Quỷ (trừ Mordred). Phải bí mật dẫn dắt Phe Người thắng — nhưng nếu bị Sát Thủ đoán trúng cuối ván, Phe Quỷ thắng!',
  [AvalonRole.Percival]:
    'Bạn nhìn thấy Merlin và Morgana, nhưng KHÔNG biết ai là ai. Hãy bảo vệ Merlin và đừng để Sát Thủ đoán trúng.',
  [AvalonRole.LoyalServant]:
    'Bạn là kỵ sĩ trung thành của Arthur. Không có thông tin đặc biệt — phải dùng thảo luận và logic để vạch mặt Phe Quỷ.',
  [AvalonRole.Mordred]:
    'Bạn là Quỷ mạnh nhất — Merlin KHÔNG nhìn thấy bạn. Hãy lợi dụng điều đó để gây nhiễu và phá hoại Quest.',
  [AvalonRole.Morgana]:
    'Bạn xuất hiện như Merlin trong mắt Percival. Hãy đánh lừa Percival để hắn bảo vệ nhầm người.',
  [AvalonRole.Oberon]:
    'Bạn là Quỷ đơn độc — KHÔNG biết ai là đồng đội Quỷ và họ cũng KHÔNG biết bạn. Tuy nhiên Merlin vẫn nhìn thấy bạn.',
  [AvalonRole.Assassin]:
    'Khi Phe Người hoàn thành 3 Quest, BẠN có cơ hội cuối cùng — chọn ai là Merlin. Đoán đúng → Phe Quỷ thắng ngược.',
  [AvalonRole.Minion]:
    'Tay sai trung thành của Mordred. Phá hoại Quest, gây nghi ngờ trong nội bộ Phe Người.',
};

export const TEAM_NAME_VI: Record<AvalonTeam, string> = {
  good: 'Phe Người',
  evil: 'Phe Quỷ',
};

export const PLAYER_COUNTS = [5, 6, 7, 8, 9, 10] as const;
export type SupportedPlayerCount = typeof PLAYER_COUNTS[number];

export const TEAM_DISTRIBUTION: Record<SupportedPlayerCount, { good: number; evil: number }> = {
  5: { good: 3, evil: 2 },
  6: { good: 4, evil: 2 },
  7: { good: 4, evil: 3 },
  8: { good: 5, evil: 3 },
  9: { good: 6, evil: 3 },
  10: { good: 6, evil: 4 },
};

export const QUEST_TEAM_SIZES: Record<SupportedPlayerCount, [number, number, number, number, number]> = {
  5:  [2, 3, 2, 3, 3],
  6:  [2, 3, 4, 3, 4],
  7:  [2, 3, 3, 4, 4],
  8:  [3, 4, 4, 5, 5],
  9:  [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

// Theo luật chính thức (xem docs/guide.md): Quest 4 chỉ cần ≥ 2 lá Phe Quỷ
// để fail KHI có từ 7 người chơi trở lên. 5-6 người vẫn chỉ cần 1 lá Fail.
export function questNeedsTwoFails(playerCount: number, questIndex: number): boolean {
  return playerCount >= 7 && questIndex === 3;
}

export const ALL_OPTIONAL_ROLES: AvalonRole[] = [
  AvalonRole.Morgana,
  AvalonRole.Oberon,
];

export const REQUIRED_ROLES: AvalonRole[] = [
  AvalonRole.Merlin,
  AvalonRole.Assassin,
  AvalonRole.Mordred,
];

// Percival is automatically bundled when Morgana is enabled (and only then).
export const PERCIVAL_BUNDLED_WITH = AvalonRole.Morgana;

export const VOTE_TRACK_LIMIT = 5;
export const QUESTS_TO_WIN = 3;
