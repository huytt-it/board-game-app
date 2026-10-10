'use client';

import type { ReactNode } from 'react';
import { serverNow } from '@/lib/serverClock';
import type { Player } from '@/types/player';
import { AvalonRole, type AvalonGameData, type AvalonGameState } from './types';
import { QUEST_TEAM_SIZES, ROLE_TEAM } from './constants';
import RoundTable from './RoundTable';
import AvIcon from './assets/AvIcon';
import AvButton from './ui/AvButton';
import AvChip from './ui/AvChip';
import GlassPanel from './ui/GlassPanel';
import PlayerAvatar from './ui/PlayerAvatar';
import { PhaseChip } from './panel/shared';

// The style board of GĐ7 (AvalonPreview → "Bảng phong cách"): every token,
// the type scale, every variant of the shared parts, the quest tiles and the
// seats, on one page — the reference the GĐ7b screens follow (ux-plan 8b).

const TOKENS: { name: string; note: string }[] = [
  { name: '--av-ink', note: 'nền đặc, chữ trên nút vàng' },
  { name: '--av-glass-bg', note: 'panel (kính)' },
  { name: '--av-line', note: 'viền mảnh duy nhất' },
  { name: '--av-text', note: 'chữ chính' },
  { name: '--av-text-2', note: 'chữ phụ' },
  { name: '--av-text-3', note: 'chú thích (≥ 4.5:1)' },
  { name: '--av-gold', note: 'màu nhấn duy nhất' },
  { name: '--av-good', note: 'phe Người — công khai' },
  { name: '--av-evil', note: 'phe Quỷ — công khai; nguy hiểm' },
  { name: '--av-lady', note: 'chỉ icon / token Lady' },
];

const AVATARS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'a', 'b', 'c', 'd'];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold text-(--av-text)">{title}</h3>
      {children}
    </section>
  );
}

function mockTable(): { players: Player[]; state: AvalonGameState } {
  const cast: [string, string, AvalonRole][] = [
    ['p1', 'An', AvalonRole.Merlin],
    ['p2', 'Bình', AvalonRole.Percival],
    ['p3', 'Chi', AvalonRole.LoyalServant],
    ['p4', 'Dũng', AvalonRole.LoyalServant],
    ['p5', 'Én', AvalonRole.Mordred],
    ['p6', 'Phong', AvalonRole.Assassin],
    ['p7', 'Giang', AvalonRole.Morgana],
  ];
  const players: Player[] = cast.map(([id, name, role]) => ({
    id,
    name,
    isAlive: true,
    isHost: id === 'p1',
    gameData: { role, team: ROLE_TEAM[role] } as AvalonGameData,
    joinedAt: new Date(0),
  }));
  const sizes = QUEST_TEAM_SIZES[7];
  const state = {
    rolesAssigned: true,
    phase: 'team-vote',
    currentQuest: 2,
    currentLeaderId: 'p3',
    proposedTeam: ['p1', 'p2', 'p4'],
    voteRejectStreak: 1,
    quests: sizes.map((s, i) => ({
      result: i === 0 ? 'success' : i === 1 ? 'fail' : null,
      failCount: i === 1 ? 1 : 0,
      teamSize: s,
      leaderId: i < 2 ? 'p2' : null,
      teamIds: i < 2 ? ['p2', 'p3', 'p6'].slice(0, s) : [],
      approveCount: i < 2 ? 5 : undefined,
      rejectCount: i < 2 ? 2 : undefined,
    })),
    teamVotes: { p2: 'approve', p4: 'reject' },
    questPlayedBy: [],
    ladyHolderId: 'p4',
    ladyHistory: [],
    ladyTargetId: null,
    merlinTargetId: null,
    winner: null,
    roleAcks: {},
    phaseStartedAt: serverNow() - 60_000,
    roleLineup: cast.map((c) => c[2]),
    leadersUsed: ['p2', 'p3'],
    lastTeamVoteResult: null,
    ladyShownCard: null,
    seatOrder: cast.map((c) => c[0]),
    assassinChoiceId: null,
  } as unknown as AvalonGameState;
  return { players, state };
}

export default function StyleBoard() {
  const table = mockTable();
  return (
    // A dark veil over the scene: the board is a reference page, not a screen of the game.
    <div className="min-h-full bg-black/60" data-style-board="">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 pb-16">
        <GlassPanel className="space-y-1 p-4">
          <h2 className="av-display text-2xl text-(--av-text)">Bảng phong cách</h2>
          <p className="text-sm text-(--av-text-2)">
            Một màu nhấn (vàng), nền trung tính, màu phe chỉ cho thông tin công khai. Mỗi màn: một tiêu đề, một câu, một việc.
          </p>
        </GlassPanel>

        <Section title="Màu">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {TOKENS.map((t) => (
              <div key={t.name} className="space-y-1.5">
                <div className="h-12 rounded-xl border border-(--av-line)" style={{ background: `var(${t.name})` }} />
                <p className="text-xs font-semibold text-(--av-text)">{t.name}</p>
                <p className="text-xs text-(--av-text-3)">{t.note}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-1" aria-label="Màu avatar">
            {AVATARS.map((id, i) => (
              <PlayerAvatar key={id} player={{ id, name: String.fromCharCode(65 + i) }} size="sm" />
            ))}
          </div>
          <p className="text-xs text-(--av-text-3)">Avatar: bảng &quot;giấy nhuộm&quot; trầm, cùng độ sáng; chữ trắng ≥ 5.7:1.</p>
        </Section>

        <Section title="Chữ">
          <GlassPanel className="space-y-2 p-4">
            <p className="av-display text-2xl text-(--av-text)">Tiêu đề lớn ≥ 20 — một mỗi màn</p>
            <p className="text-base font-semibold text-(--av-text)">Tiêu đề panel 16</p>
            <p className="text-sm text-(--av-text-2)">Thân 14 — câu trạng thái hoặc hướng dẫn, tối đa hai dòng.</p>
            <p className="text-xs text-(--av-text-3)">Chú thích 12 — không có chữ nhỏ hơn.</p>
          </GlassPanel>
        </Section>

        <Section title="Nút (AvButton)">
          <GlassPanel className="space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <AvButton variant="primary" icon="check">Trình đội</AvButton>
              <AvButton variant="secondary" icon="details">Chi tiết</AvButton>
              <AvButton variant="danger" icon="delete">Xoá phòng</AvButton>
              <AvButton variant="ghost" icon="eye">Vai của tôi</AvButton>
              <AvButton variant="ghost" icon="more" aria-label="Menu" />
              <AvButton variant="ghost" danger icon="delete">Xoá phòng (dòng menu)</AvButton>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <AvButton variant="primary" size="lg" icon="check">Cỡ lg (dock)</AvButton>
              <AvButton variant="primary" disabled>Đang khoá</AvButton>
              <AvButton variant="secondary" disabled>Đang khoá</AvButton>
            </div>
            <div className="grid max-w-md grid-cols-2 gap-3">
              <AvButton variant="choice" size="lg" icon="vote-approve">Đồng ý</AvButton>
              <AvButton variant="choice" size="lg" icon="vote-reject">Từ chối</AvButton>
              <AvButton variant="choice" size="lg" icon="quest-success" selected>Được chọn</AvButton>
              <AvButton variant="choice" size="lg" icon="quest-fail">Chưa chọn</AvButton>
            </div>
          </GlassPanel>
        </Section>

        <Section title="Chip">
          <GlassPanel className="flex flex-wrap items-center gap-2 p-4 @container">
            <AvChip icon="clock">Trung tính</AvChip>
            <AvChip tone="accent" icon="leader">Nhấn</AvChip>
            <PhaseChip phase="team-vote" />
            <PhaseChip phase="team-vote" turn />
            <PhaseChip phase="discussion" />
          </GlassPanel>
        </Section>

        <Section title="Panel (GlassPanel)">
          <div className="grid gap-3 sm:grid-cols-4">
            {(['neutral', 'accent', 'good', 'evil'] as const).map((tone) => (
              <GlassPanel key={tone} tone={tone} className="p-4">
                <p className="text-base font-semibold text-(--av-text)">{tone}</p>
                <p className="mt-1 text-xs text-(--av-text-3)">
                  {tone === 'neutral'
                    ? 'mặc định'
                    : tone === 'accent'
                      ? 'panel chính khi đến lượt bạn'
                      : tone === 'good'
                        ? 'kết quả công khai'
                        : 'kết quả công khai; cảnh báo'}
                </p>
              </GlassPanel>
            ))}
          </div>
        </Section>

        <Section title="Bàn: ô Quest và ghế">
          <ul className="grid gap-1 text-xs text-(--av-text-2) sm:grid-cols-2">
            <li>
              <AvIcon name="quest-success" className="text-(--av-good-light)" /> I thắng · <AvIcon name="quest-fail" className="text-(--av-evil-light)" /> II thua ·
              III đang chơi (vàng) · IV chưa chơi, dấu 2 lá · V chưa chơi
            </li>
            <li>
              Ghế: An = bạn (viền đứt), An / Bình / Dũng được đề cử (vòng giấy da), gợi ý đêm của Merlin (góc phải: Giang, Phong); chấm
              góc trái: đặc = đã bầu (Bình, Dũng), rỗng = chưa bầu
            </li>
          </ul>
          <div className="mx-auto max-w-[420px]">
            <RoundTable players={table.players} state={table.state} myPlayerId="p1" viewerRole={AvalonRole.Merlin} playerCount={7} />
          </div>
        </Section>
      </div>
    </div>
  );
}
