'use client';

import { useCue } from '@/components/games/shared/hooks/useCue';
import { usePhaseTimeline } from '@/components/games/shared/hooks/usePhaseTimeline';
import { isDead } from '../state';
import WwIcon from '../assets/WwIcon';
import Panel from '../ui/Panel';
import { DAWN, DAWN_STAGES } from '../scenes/timelines';
import { PhaseHeader, PhaseLayout, RoleLine, RoleTag, Seat, nameOf, revealedRole, type PanelCtx } from './shared';

// Bình minh (rules §5.6): người chết đêm qua theo thứ tự ghế (kể cả người chết
// theo người yêu — rules §11.5, E42), không nói nguyên nhân. Lật vai nếu bật "Lộ vai khi chết". 8 giây, không ai bấm gì.
// Màn rộng thêm cả làng bên trái: ai còn sống, ai đã nằm dưới bia mộ (công khai).
//
// Hoạt cảnh (GĐ4, scenes/timelines.ts DAWN): mặt trời lên (cảnh nền); khung
// công bố hiện ra; người chết hiện LẦN LƯỢT THEO GHẾ, mỗi người một ô thời gian
// cố định (ghế của họ ở màn rộng thành bia mộ cùng lúc); rồi vai lật cùng lúc.
// "Đêm qua bình yên" dùng đúng các ô thời gian ấy và xong cùng lúc. Mọi thứ
// theo đồng hồ chung; khung cuối đứng yên tới hết 8 giây.
export default function DawnPanel({ ctx }: { ctx: PanelCtx }) {
  const deaths = ctx.state.dawnDeaths ?? [];
  const cue = useCue(ctx.state.phaseStartedAt);
  const { stage } = usePhaseTimeline(ctx.state.phaseStartedAt, DAWN_STAGES);
  const slot = new Map(deaths.map((id, i) => [id, i]));
  const flipAt = (i: number) => ({ animationDelay: cue(DAWN.flipAt + i * DAWN.flipGapMs) });
  // Ván có Cupid (công khai qua bộ vai): sáng ngày 1 nhắc mọi người xem mình có được ghép đôi không.
  const cupidHint = ctx.state.round === 1 && (ctx.state.roleCounts?.cupid ?? 0) > 0;
  return (
    <PhaseLayout
      section="dawn"
      data-ww-anim-stage={stage}
      header={<PhaseHeader title={`Sáng ngày ${ctx.state.round}`} remaining={ctx.remaining} warn={false} />}
      stageOnPhone={false}
      stage={
        <div className="grid grid-cols-3 gap-3" role="list" aria-label="Người trong làng">
          {ctx.players.map((p) => {
            const dead = isDead(ctx.state, p.id);
            const role = revealedRole(ctx, p.id);
            const i = slot.get(p.id);
            return (
              <div key={p.id} role="listitem">
                <Seat
                  player={p}
                  dead={dead}
                  fall={i !== undefined ? cue(DAWN.slotFor(i, deaths.length)) : undefined}
                  sub={
                    role ? (
                      i !== undefined ? (
                        <span className="ww-a-flip block" style={flipAt(i)}>
                          <RoleLine role={role} />
                        </span>
                      ) : (
                        <RoleLine role={role} />
                      )
                    ) : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      }
    >
      {deaths.length === 0 ? (
        <Panel
          className="ww-a-pop flex flex-col items-center gap-2 px-4 py-6 text-center lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
          style={{ animationDelay: cue(DAWN.slotAt(0)) }}
          data-ww-dawn="peaceful"
        >
          <span className="relative flex size-16 items-center justify-center">
            {/* Quầng nắng toả ra ở mốc lật vai: bình yên cũng xong cùng lúc với có người chết. */}
            <span aria-hidden="true" className="ww-a-glow absolute inset-0 rounded-full bg-white/8" style={{ animationDelay: cue(DAWN.flipAt) }} />
            <WwIcon name="dawn" size={40} className="ww-a-rise-sm relative text-(--ww-moon)" style={{ animationDelay: cue(DAWN.slotAt(0)) }} />
          </span>
          <p className="ww-a-fade text-base font-semibold text-(--ww-text)" style={{ animationDelay: cue(DAWN.slotAt(1)) }}>
            Đêm qua bình yên. Không ai chết.
          </p>
        </Panel>
      ) : (
        <Panel
          className="ww-a-pop px-4 py-4 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
          style={{ animationDelay: cue(DAWN.leadAt) }}
          data-ww-dawn="deaths"
        >
          <p className="mb-3 text-center text-base text-(--ww-text-2) lg:text-left">Đêm qua có người chết:</p>
          <ul className="space-y-2">
            {deaths.map((id, i) => {
              const role = revealedRole(ctx, id);
              return (
                <li
                  key={id}
                  className="ww-a-pop flex min-h-12 items-center gap-3 rounded-xl bg-(--ww-raised) px-3 py-2"
                  style={{ animationDelay: cue(DAWN.slotFor(i, deaths.length)) }}
                  data-ww-dead={id}
                >
                  <WwIcon name="dead" size={26} className="text-(--ww-text-3)" />
                  <span className="min-w-0 flex-1 truncate font-semibold text-(--ww-text)">{nameOf(ctx.players, id)}</span>
                  {role && (
                    <span className="ww-a-flip inline-flex" style={flipAt(i)}>
                      <RoleTag role={role} />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
      {cupidHint && (
        <div className="ww-a-fade mt-3" style={{ animationDelay: cue(DAWN.doneAt) }} data-ww-cupid-hint="">
          <p className="flex items-start gap-2 rounded-2xl bg-(color:--ww-glass-bg) px-3 py-2 text-sm text-(--ww-text-2)">
            <WwIcon name="lovers" size={16} className="mt-0.5 shrink-0 text-(--ww-text-3)" />
            Ván có Cupid: giữ “Vai của tôi” (menu ⋯) để xem mình có được ghép đôi không.
          </p>
        </div>
      )}
    </PhaseLayout>
  );
}
