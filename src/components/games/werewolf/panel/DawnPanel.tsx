'use client';

import { isDead } from '../state';
import WwIcon from '../assets/WwIcon';
import Panel from '../ui/Panel';
import { PhaseHeader, PhaseLayout, RoleLine, RoleTag, Seat, nameOf, revealedRole, type PanelCtx } from './shared';

// Bình minh (rules §5.6): người chết đêm qua theo thứ tự ghế, không nói
// nguyên nhân. Lật vai nếu bật "Lộ vai khi chết". 8 giây, không ai bấm gì.
// Màn rộng thêm cả làng bên trái: ai còn sống, ai đã nằm dưới bia mộ (công khai).
export default function DawnPanel({ ctx }: { ctx: PanelCtx }) {
  const deaths = ctx.state.dawnDeaths ?? [];
  return (
    <PhaseLayout
      section="dawn"
      header={<PhaseHeader title={`Sáng ngày ${ctx.state.round}`} remaining={ctx.remaining} warn={false} />}
      stageOnPhone={false}
      stage={
        <div className="grid grid-cols-3 gap-3" role="list" aria-label="Người trong làng">
          {ctx.players.map((p) => {
            const dead = isDead(ctx.state, p.id);
            const role = revealedRole(ctx, p.id);
            return (
              <div key={p.id} role="listitem">
                <Seat player={p} dead={dead} sub={role ? <RoleLine role={role} /> : undefined} />
              </div>
            );
          })}
        </div>
      }
    >
      {deaths.length === 0 ? (
        <Panel className="flex flex-col items-center gap-2 px-4 py-6 text-center lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none" data-ww-dawn="peaceful">
          <WwIcon name="dawn" size={40} className="text-(--ww-moon)" />
          <p className="text-base font-semibold text-(--ww-text)">Đêm qua bình yên. Không ai chết.</p>
        </Panel>
      ) : (
        <Panel className="px-4 py-4 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none" data-ww-dawn="deaths">
          <p className="mb-3 text-center text-base text-(--ww-text-2) lg:text-left">Đêm qua có người chết:</p>
          <ul className="space-y-2">
            {deaths.map((id) => {
              const role = revealedRole(ctx, id);
              return (
                <li key={id} className="flex min-h-12 items-center gap-3 rounded-xl bg-(--ww-raised) px-3 py-2" data-ww-dead={id}>
                  <WwIcon name="dead" size={26} className="text-(--ww-text-3)" />
                  <span className="min-w-0 flex-1 truncate font-semibold text-(--ww-text)">{nameOf(ctx.players, id)}</span>
                  {role && <RoleTag role={role} />}
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </PhaseLayout>
  );
}
