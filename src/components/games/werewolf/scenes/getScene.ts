// Phase → cảnh. Chỉ dựa vào thông tin công khai (phase, phe thắng), nên mọi máy
// và mọi vai thấy cùng một cảnh; reload vẫn đúng cảnh.
import type { WerewolfGameState } from '../types';
import type { SceneId } from './types';

/**
 * Mốc bắt đầu chuyển động của cảnh (GĐ4), hoặc null = cảnh đứng yên ở khung cuối:
 * - Bình minh: mặt trời lên, trời sáng dần;
 * - Đêm từ đêm 2 (cảnh vừa đổi từ giàn treo / ban ngày sang làng ban đêm): trăng
 *   lên. Đêm 1 nối tiếp màn xem vai cùng cảnh, trăng đã ở trên trời.
 */
export function getSceneMotion(state: Pick<WerewolfGameState, 'phase' | 'phaseStartedAt' | 'round'> | null): number | null {
  if (!state) return null;
  if (state.phase === 'dawn' || (state.phase === 'night' && state.round > 1)) return state.phaseStartedAt;
  return null;
}

export function getScene(state: Pick<WerewolfGameState, 'phase' | 'hunter' | 'winner'> | null): SceneId {
  if (!state) return 'village-night'; // sảnh, đang tải
  switch (state.phase) {
    case 'deal':
    case 'night':
    case 'night-witch':
      return 'village-night';
    case 'dawn':
      return 'dawn';
    case 'hunter':
      return state.hunter?.after === 'vote' ? 'gallows' : 'day';
    case 'day-talk':
    case 'day-vote':
      return 'day';
    case 'vote-result':
      return 'gallows';
    case 'end':
      switch (state.winner) {
        case 'wolves':
          return 'end-wolves';
        case 'tanner':
          return 'end-tanner';
        case 'lovers':
          return 'end-lovers';
        default:
          return 'end-village';
      }
  }
}
