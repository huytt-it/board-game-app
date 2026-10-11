'use client';

import { Avatar, PhaseHeader, RoleTag, nameOf, revealedRole, type PanelCtx } from './shared';

// Bình minh (rules §5.6): người chết đêm qua theo thứ tự ghế, không nói
// nguyên nhân. Lật vai nếu bật "Lộ vai khi chết". 8 giây, không ai bấm gì.
export default function DawnPanel({ ctx }: { ctx: PanelCtx }) {
  const deaths = ctx.state.dawnDeaths ?? [];
  return (
    <section data-phase-section="dawn">
      <PhaseHeader title={`Sáng ngày ${ctx.state.round}`} remaining={ctx.remaining} />
      {deaths.length === 0 ? (
        <p className="rounded-2xl bg-slate-800/70 px-4 py-8 text-center text-lg font-semibold text-slate-100" data-ww-dawn="peaceful">
          Đêm qua bình yên. Không ai chết.
        </p>
      ) : (
        <div className="rounded-2xl bg-slate-800/70 px-4 py-4" data-ww-dawn="deaths">
          <p className="mb-3 text-center text-base text-slate-200">Đêm qua có người chết:</p>
          <ul className="space-y-2">
            {deaths.map((id) => {
              const role = revealedRole(ctx, id);
              return (
                <li key={id} className="flex items-center gap-3 rounded-xl bg-slate-900/60 px-3 py-2" data-ww-dead={id}>
                  <Avatar name={nameOf(ctx.players, id)} dim />
                  <span className="flex-1 font-semibold text-slate-100">{nameOf(ctx.players, id)}</span>
                  {role && <RoleTag role={role} />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
