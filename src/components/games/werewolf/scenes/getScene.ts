// Phase → cảnh. Chỉ dựa vào thông tin công khai (phase, phe thắng), nên mọi máy
// và mọi vai thấy cùng một cảnh; reload vẫn đúng cảnh.
import type { WerewolfGameState } from '../types';
import type { SceneId } from './types';

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
      return state.winner === 'wolves' ? 'end-wolves' : 'end-village';
  }
}
