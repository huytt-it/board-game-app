// Mốc thời gian của mọi hoạt cảnh Ma Sói (plan §9, GĐ4). Mỗi mốc là số ms sau
// state.phaseStartedAt trên đồng hồ chung (serverNow): mọi máy thấy cùng một
// khung hình, reload hay vào trễ thì nhảy đúng khung, không phát lại
// (usePhaseTimeline / useCue, bù độ trễ dựng: hooks/useCueSync). Mảng stage là
// hằng cấp module: usePhaseTimeline cần tham chiếu ổn định. Độ dài hiệu ứng
// (…Ms) khớp với animation `ww-a-*` trong werewolf.css — đổi thì đổi cả hai.
//
// Không hoạt cảnh nào chặn bước có giờ: ở Đêm ①, Đêm ②, Thợ săn, Bỏ phiếu lưới
// và nút bấm được từ T = 0 (lớp trang trí luôn `pointer-events: none`). Bình
// minh và Kết quả phiếu (cố định 8 s) xong trong ≤ 6,5 s, khung cuối đứng yên.
// Hoạt cảnh chỉ dựa vào thông tin công khai, nên giống hệt nhau với mọi vai.
import type { TimelineStage } from '@/components/games/shared/hooks/usePhaseTimeline';
import type { WerewolfGameState, WwLogEntry } from '../types';

// ─── Vào đêm (night) ───────────────────────────────────────────────
export const NIGHTFALL = {
  /** 0–1,2 s: màn sẫm lại, "Đêm N" hiện giữa màn rồi tan (lớp phủ trang trí,
   *  bấm xuyên qua được). */
  veilMs: 1200,
  /** Từ đêm 2 (cảnh đổi từ giàn treo / ban ngày sang làng ban đêm): trăng lên
   *  sau ngọn đồi, 0–2,4 s. Đêm 1 nối tiếp màn xem vai, trăng đã ở trên trời. */
  moonMs: 2400,
} as const;

// ─── Bình minh (dawn, 8 s; hoạt cảnh ≤ 4,6 s) ──────────────────────
// Người chết đêm qua (thường ≤ 2: bị cắn + trúng độc; vai mở rộng: tới 4 — cắn 2,
// độc, người chết theo người yêu) hiện lần lượt THEO GHẾ,
// mỗi người một "ô" thời gian cố định; vai lật cùng một lúc cho mọi lá (nếu
// bật "Lộ vai khi chết"). "Đêm qua bình yên" có hoạt cảnh riêng nhưng dùng
// đúng các ô thời gian ấy và xong cùng lúc, để nhịp không nói lên gì.
export const DAWN = {
  /** 0–2,4 s: mặt trời lên sau đồi, trời sáng dần (cảnh nền). */
  sunMs: 2400,
  /** Khung công bố hiện ra. */
  leadAt: 800,
  /** Người chết thứ i (theo ghế) hiện ra; bình yên: icon (ô 0) rồi câu (ô 1). */
  slotAt: (i: number) => 1600 + 1200 * i,
  /**
   * Ô của người chết thứ i khi đêm qua có `n` người chết: ≤ 2 người giống hệt
   * slotAt (GĐ4); từ 3 người (vai mở rộng) các ô dồn lại để lá cuối hiện xong
   * trước mốc lật vai (≤ 3,35 s). Số người chết là công khai.
   */
  slotFor: (i: number, n: number) => 1600 + (n <= 2 ? 1200 : Math.floor(1750 / (n - 1))) * i,
  cardMs: 450,
  /** Lật vai: lá thứ i lúc flipAt + i·flipGapMs; bình yên: các tia nắng. */
  flipAt: 3800,
  flipGapMs: 150,
  flipMs: 500,
  /** Khung cuối, như nhau với mọi biến thể. */
  doneAt: 4600,
} as const;

export type DawnStage = 'lead' | 'reveal' | 'flip' | 'done';
export const DAWN_STAGES: readonly TimelineStage<DawnStage>[] = [
  { id: 'lead', at: 0 },
  { id: 'reveal', at: DAWN.slotAt(0) },
  { id: 'flip', at: DAWN.flipAt },
  { id: 'done', at: DAWN.doneAt },
];

// ─── Kết quả phiếu (vote-result, 8 s; hoạt cảnh ≤ 4,6 s) ───────────
// Phiếu gom thành cột đếm: mỗi người được bầu (và "Bỏ qua") là một hàng; tên
// người bầu rơi vào hàng theo thứ tự ghế của người bầu. Rồi phán quyết: giàn
// treo + tên người bị treo + lật vai (theo luật), hoặc "Không ai bị treo".
export const VOTE_RESULT = {
  /** Các hàng (người được bầu, theo ghế; "Bỏ qua" cuối) hiện ra. */
  rowsAt: 200,
  rowsMs: 450,
  /** Phiếu thứ k (người bầu theo ghế) rơi vào hàng. ≤ 9 phiếu: phiếu cuối chạm lúc 2,49 s. */
  ballotAt: (k: number) => 700 + 180 * k,
  ballotMs: 350,
  /** Phán quyết: hàng của người bị treo sáng lên, khung kết quả hiện ra. */
  verdictAt: 3000,
  verdictMs: 450,
  /** Giàn treo dập xuống. */
  gibbetAt: 3100,
  gibbetMs: 700,
  /** Lật vai người bị treo (nếu bật "Lộ vai khi chết"). */
  flipAt: 3800,
  flipMs: 500,
  doneAt: 4600,
} as const;

export type VoteResultStage = 'tally' | 'verdict' | 'flip' | 'done';
export const VOTE_RESULT_STAGES: readonly TimelineStage<VoteResultStage>[] = [
  { id: 'tally', at: 0 },
  { id: 'verdict', at: VOTE_RESULT.verdictAt },
  { id: 'flip', at: VOTE_RESULT.flipAt },
  { id: 'done', at: VOTE_RESULT.doneAt },
];

// ─── Phát bắn của Thợ săn (ở bước KẾ TIẾP, 0–4,2 s) ────────────────
// Bước Thợ săn chỉ ghi một CAS (không chờ hoạt cảnh). Bước sau đó (Thảo luận,
// Đêm, hoặc Kết thúc) diễn lại phát bắn từ mục 'hunter' của nhật ký: tấm thẻ
// nhỏ trên đầu màn, hồng tâm khép lại trên người bị bắn, chớp, bia mộ, lật vai.
export const HUNTER_SHOT = {
  inMs: 300,
  /** Hồng tâm khép lại (0,9 s) rồi đứng tới lúc bắn; mất ở fallAt. */
  aimAt: 300,
  aimMs: 900,
  fireAt: 1250,
  fireMs: 350,
  fallAt: 1400,
  fallMs: 400,
  flipAt: 1900,
  flipMs: 500,
  outAt: 3800,
  outMs: 400,
  doneAt: 4200,
} as const;

type HunterEntry = Extract<WwLogEntry, { kind: 'hunter' }>;

/**
 * Người chết theo người yêu ngay trong lượt `id` chết ở vòng `round` (rules
 * §11.5: bị treo, bị Thợ săn bắn), theo nhật ký. Công bố cùng lúc với người
 * kia, không nói nguyên nhân (nguyên nhân chỉ ở màn kết thúc).
 */
export function loveFollowersOf(log: readonly WwLogEntry[] | undefined, id: string | null, round: number): string[] {
  if (!id) return [];
  return (log ?? []).flatMap((e) => (e.kind === 'love' && e.loverId === id && e.round === round ? [e.id] : []));
}

/**
 * Phát bắn vừa xong, nếu bước hiện tại là bước NGAY SAU bước Thợ săn; null nếu
 * không. Mỗi ván có tối đa một Thợ săn nên có tối đa một mục 'hunter':
 *  - Thảo luận vòng r: Thợ săn bắn sau bình minh vòng r;
 *  - Đêm r: Thợ săn bắn sau khi bị treo ở vòng r − 1 (mục nằm sau phiếu của vòng đó);
 *  - Kết thúc: phát bắn là mục cuối của nhật ký (phát bắn kết thúc ván).
 */
export function hunterShotOf(state: Pick<WerewolfGameState, 'phase' | 'round' | 'log'>): HunterEntry | null {
  const log = state.log ?? [];
  const i = log.findIndex((e) => e.kind === 'hunter');
  if (i < 0) return null;
  const e = log[i] as HunterEntry;
  switch (state.phase) {
    case 'day-talk':
      return e.round === state.round ? e : null;
    case 'night':
      return e.round === state.round - 1 && log.some((v, j) => j < i && v.kind === 'vote' && v.round === e.round) ? e : null;
    case 'end':
      // Phát bắn là việc cuối của ván (sau nó chỉ có người chết theo người yêu bị bắn).
      return log.slice(i + 1).every((v) => v.kind === 'love' && v.round === e.round) ? e : null;
    default:
      return null;
  }
}

// ─── Kết thúc (end, không giới hạn giờ) ────────────────────────────
// Nếu ván kết thúc bằng phát bắn của Thợ săn thì phát bắn diễn trước, màn kết
// thúc bắt đầu ở R = HUNTER_SHOT.doneAt; không thì R = 0. Chạm để bỏ qua chỉ
// có tác dụng trên máy mình (nhảy thẳng tới khung cuối).
export const END = {
  /** R … R+0,7 s: phe thắng hiện ra. */
  bannerMs: 700,
  /** R+0,6 s: "Phe bạn thắng!" / "Phe bạn thua." */
  chipAt: 600,
  /** R+0,5 s: lật vai từng ghế theo thứ tự ghế, cách nhau 150 ms (10 ghế: lá cuối xong R+2,35 s). */
  flipAt: 500,
  flipGapMs: 150,
  flipMs: 500,
  /** R+2 s: "Diễn biến ván" (kể theo từng đêm / ngày, bấm qua từng bước). */
  storyAt: 2000,
  storyMs: 450,
  doneMs: 2600,
} as const;

export type EndStage = 'shot' | 'reveal' | 'done';

const endStages = new Map<number, readonly TimelineStage<EndStage>[]>();
/** Các stage của màn kết thúc khi phần lộ bắt đầu ở `revealAt` (ổn định theo R). */
export function endTimeline(revealAt: number): readonly TimelineStage<EndStage>[] {
  const r = Math.max(0, Math.round(revealAt));
  let st = endStages.get(r);
  if (!st) {
    st = [...(r > 0 ? [{ id: 'shot' as const, at: 0 }] : []), { id: 'reveal', at: r }, { id: 'done', at: r + END.doneMs }];
    endStages.set(r, st);
  }
  return st;
}
