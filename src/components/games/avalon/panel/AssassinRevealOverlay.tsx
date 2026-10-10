import type { Player } from '@/types/player';
import { AvalonRole } from '../types';
import { ROLE_TEAM } from '../constants';
import { usePhaseTimeline } from '../hooks/usePhaseTimeline';
import { END } from '../table/timelines';
import AvIcon from '../assets/AvIcon';
import PlayerAvatar from '../ui/PlayerAvatar';
import RoleEmblem from '../ui/RoleEmblem';

// Các mốc của overlay, tính bằng ms kể từ lúc phase `end` bắt đầu
// (state.phaseStartedAt):
//   fly-in   : 0-1000ms — card cam (target) bay vào giữa
//   blackout : 1000-1800ms — màn hình tắt đèn đen kịt rồi mở lại (0.8s)
//   split    : 1800-3550ms — card tách đôi + đường chém đỏ, hold lâu
//                            cho mọi người thấy rõ vết cắt (1.75s, +1s)
//   white    : 3550-4250ms — flash trắng xoá
//   reveal   : 4250-7950ms — card lộ vai thật + tuyên bố thắng/thua (3.7s)
//   done     : ≥7950ms (END.overlayMs) — màn kết thúc bắt đầu (EndSection)
const OVERLAY_STAGES = [
  { id: 'fly-in', at: 0 },
  { id: 'blackout', at: 1000 },
  { id: 'split', at: 1800 },
  { id: 'white', at: 3550 },
  { id: 'reveal', at: 4250 },
  { id: 'done', at: END.overlayMs },
] as const;

// Overlay full-screen: card bay vào giữa → kiếm chém → card tách đôi và lộ
// role thật. Mọi người đều thấy được vì target được đọc từ state.merlinTargetId
// — broadcast qua DB. Mốc hiện tại tính từ `startedAt` theo giờ server (không
// theo lúc mount), nên reload sau ~8s thì không phát lại, còn vào lại giữa chừng
// thì nhảy thẳng tới đúng khung. Chạm vào overlay (hoặc nút "Bỏ qua") thì
// `onSkip`: chỉ máy này bỏ qua, màn kết thúc hiện ngay (hooks/useEndReveal).
// Giảm chuyển động: overlay không hiện; thẻ "Sát Thủ đâm" tĩnh của
// EndSection kể cùng nội dung.
export function AssassinRevealOverlay({
  target,
  targetRole,
  startedAt,
  onSkip,
}: {
  target: Player;
  targetRole: AvalonRole | null;
  startedAt: number;
  onSkip?: () => void;
}) {
  const { stage } = usePhaseTimeline(startedAt, OVERLAY_STAGES);

  if (stage === 'done') return null;

  const role = targetRole;
  const isMerlin = role === AvalonRole.Merlin;
  const team = role ? ROLE_TEAM[role] : null;

  // Nội dung lá bài (cùng 1 layout) — reuse cho fly-in, slash và 2 nửa khi
  // split để 2 nửa trông như được cắt ra từ chính card này.
  const cardContent = (
    <>
      <p className="text-[11px] uppercase font-bold tracking-widest text-amber-300">
        Sát Thủ chọn
      </p>
      <PlayerAvatar player={target} size="xl" className="mt-4 border-4 border-amber-200 shadow-lg shadow-amber-500/40" />
      <p className="av-display mt-4 text-3xl text-white">{target.name}</p>
      <p className="mt-2 text-xs text-slate-400">là Merlin?</p>
    </>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in"
      onClick={onSkip}
      data-assassin-overlay={stage}
    >
      <div className="relative w-[280px] h-[380px] sm:w-[320px] sm:h-[440px]">
        {(stage === 'fly-in' || stage === 'blackout') && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`flex h-full w-full flex-col items-center justify-center rounded-3xl border-4 bg-gradient-to-br from-amber-900/80 via-orange-900/70 to-slate-950 shadow-2xl border-amber-400/80 shadow-amber-500/50 ${stage === 'fly-in' ? 'av-assassin-fly-in' : ''
                }`}
            >
              {cardContent}
            </div>
          </div>
        )}

        {stage === 'split' && (
          <div className="absolute inset-0">
            {/* Nửa trên-phải: clip tam giác (top-left, top-right, bottom-right).
                Trôi lên-phải. */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border-4 border-amber-400/80 bg-gradient-to-br from-amber-900/80 via-orange-900/70 to-slate-950 shadow-2xl shadow-amber-500/40 av-split-upper"
              style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%)' }}
            >
              {cardContent}
            </div>
            {/* Nửa dưới-trái: clip tam giác (top-left, bottom-right, bottom-left).
                Trôi xuống-trái. */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border-4 border-amber-400/80 bg-gradient-to-br from-amber-900/80 via-orange-900/70 to-slate-950 shadow-2xl shadow-amber-500/40 av-split-lower"
              style={{ clipPath: 'polygon(0% 0%, 100% 100%, 0% 100%)' }}
            >
              {cardContent}
            </div>
            {/* Đường chém đỏ phát sáng — xoay -45° để cùng hướng đường tách
                clip-path TL→BR của 2 nửa lá bài. */}
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 h-[140%] w-[3px] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-gradient-to-b from-transparent via-(--av-evil-light) to-transparent shadow-[0_0_24px_4px_rgba(224,85,85,0.75)]"
            />
          </div>
        )}

        {stage === 'white' && (
          <div className="fixed inset-0 z-10 av-assassin-whiteout" />
        )}

        {/* Blackout layer: tách độc lập, fixed inset-0 che cả màn hình. z-40
            đè lên cả card và bg overlay. animation alpha 0→1→1→0 (0.8s) tạo
            hiệu ứng tắt-đèn-rồi-mở-lại. */}
        {stage === 'blackout' && (
          <div className="fixed inset-0 z-40 av-assassin-blackout pointer-events-none" />
        )}

        {stage === 'reveal' && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-white/95 animate-fade-in">
            <div
              className={`mx-4 max-w-md w-full rounded-3xl border-4 bg-(color:--av-ink) px-6 py-7 text-center shadow-2xl shadow-black/50 animate-scale-in ${isMerlin
                ? 'border-(--av-evil)/80 bg-linear-to-br from-(--av-evil)/35 to-transparent'
                : team === 'good'
                  ? 'border-(--av-good)/80 bg-linear-to-br from-(--av-good)/35 to-transparent'
                  : 'border-slate-500/80 bg-linear-to-br from-slate-700/40 to-transparent'
                }`}
            >
              <p className="text-[11px] uppercase font-black tracking-widest text-slate-300">
                Lá bài bị chém
              </p>
              <p className="mt-1 text-xl font-black text-white">{target.name}</p>
              {role ? (
                <>
                  <div className="my-3 flex justify-center">
                    <RoleEmblem role={role} size="xl" />
                  </div>
                  <p
                    className={`av-display text-3xl ${isMerlin
                      ? 'text-(--av-evil-light)'
                      : team === 'good'
                        ? 'text-(--av-good-light)'
                        : 'text-slate-200'
                      }`}
                  >
                    {role}
                  </p>
                  <p
                    className={`mt-1 text-[11px] uppercase font-black tracking-widest ${team === 'good' ? 'text-(--av-good-light)' : 'text-(--av-evil-light)'
                      }`}
                  >
                    <AvIcon name={team === 'good' ? 'team-good' : 'team-evil'} />{' '}
                    {team === 'good' ? 'Phe Người' : 'Phe Quỷ'}
                  </p>
                </>
              ) : (
                <p className="my-6 text-sm text-slate-300">(Không xác định vai)</p>
              )}
              <div
                className={`mt-4 rounded-2xl border-2 py-3 px-4 ${isMerlin
                  ? 'border-(--av-evil)/60 bg-(--av-evil)/15'
                  : 'border-(--av-good)/60 bg-(--av-good)/15'
                  }`}
              >
                <p
                  className={`text-base font-black uppercase tracking-widest ${isMerlin ? 'text-(--av-evil-light)' : 'text-(--av-good-light)'
                    }`}
                >
                  <AvIcon name={isMerlin ? 'team-evil' : 'team-good'} />{' '}
                  {isMerlin
                    ? 'Sát Thủ đoán đúng — Phe Quỷ thắng'
                    : 'Sát Thủ đoán sai — Phe Người thắng'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      {onSkip && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSkip();
          }}
          className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 min-h-11 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-black/85"
        >
          Chạm để bỏ qua
        </button>
      )}
    </div>
  );
}
