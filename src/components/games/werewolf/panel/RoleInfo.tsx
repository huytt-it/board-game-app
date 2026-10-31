'use client';

import type { ReactNode } from 'react';
import { ROLE_NAME, ROLE_TEAM, TEAM_NAME, isWolfRole } from '@/components/games/werewolf/engine/roles.ts';
import { loverOf, loversOf, roleOf, wolfIds } from '@/components/games/werewolf/engine/table.ts';
import { isLoversTeam, teamOf } from '@/components/games/werewolf/engine/win.ts';
import { elderLifeOf } from '../state';
import WwIcon, { type IconName } from '../assets/WwIcon';
import type { WerewolfGameState, WwTeam } from '../types';
import { nameOf, roleText, TEAM_TEXT, type PanelCtx } from './shared';

// Phần riêng của vai mở rộng (rules §11) — CHỈ gọi bên trong thẻ đang giữ
// (Xem vai, Đêm ①, "Vai của tôi", thẻ của người chết): Tay sai thấy bầy Sói,
// Già làng thấy mạng phụ, người trong cặp thấy "Bạn yêu X — X là ‹vai›",
// Cupid thấy cặp đã ghép. Khi không giữ, không có DOM nào từ file này.

/**
 * Cặp đôi được biết từ Bình minh ngày 1 (rules §11.5): trong Đêm ① / Đêm ② của
 * đêm 1, cặp đã chốt trong state nhưng chưa ai được thấy.
 */
export function loversVisible(state: Pick<WerewolfGameState, 'phase' | 'round'> | undefined): boolean {
  if (!state) return true;
  return !(state.round <= 1 && (state.phase === 'deal' || state.phase === 'night' || state.phase === 'night-witch'));
}

type InfoCtx = Pick<PanelCtx, 'me' | 'myData' | 'players' | 'table'> & { state?: Pick<WerewolfGameState, 'phase' | 'round'> };

/** Phe của người xem lúc này (Tình nhân chỉ khi đã được biết), hoặc null. */
export function myTeam(ctx: InfoCtx): WwTeam | null {
  const role = ctx.myData.role;
  if (!role) return null;
  if (!loversVisible(ctx.state)) return ROLE_TEAM[role];
  return teamOf(ctx.table, ctx.me.id) ?? ROLE_TEAM[role];
}

const TEAM_LINE: Record<WwTeam, string> = {
  wolves: 'Phe Sói',
  village: 'Phe Dân làng',
  tanner: 'Phe riêng — Kẻ chán đời',
  lovers: 'Phe Tình nhân',
};

export function TeamLine({ team }: { team: WwTeam }) {
  return (
    <p className={`text-xs font-semibold ${TEAM_TEXT[team]}`} data-ww-my-team={team}>
      {TEAM_LINE[team]}
    </p>
  );
}

function Line({ icon, children, ...attrs }: { icon: IconName; children: ReactNode } & Record<`data-${string}`, string>) {
  return (
    <p className="flex items-start gap-1.5 text-sm leading-snug text-(--ww-text)" {...attrs}>
      <WwIcon name={icon} size={15} className="mt-0.5 shrink-0 text-(--ww-text-3)" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/**
 * Các dòng riêng của vai mở rộng (đặt dưới câu mô tả vai). `compact`: chỉ dòng
 * ngắn nhất cho thẻ Đêm ① (thẻ cao cố định).
 */
export function RoleNotes({ ctx, compact = false }: { ctx: InfoCtx; compact?: boolean }) {
  const role = ctx.myData.role;
  if (!role) return null;
  const out: ReactNode[] = [];
  const name = (id: string) => nameOf(ctx.players, id);

  // Sói / Sói con thấy đồng đội (Tay sai không nằm trong bầy, Sói không biết Tay sai).
  if (isWolfRole(role) && !compact) {
    const mates = wolfIds(ctx.table).filter((id) => id !== ctx.me.id);
    out.push(
      <Line key="mates" icon="werewolf" data-ww-mates="">
        {mates.length > 0 ? <>Đồng đội: {mates.map(name).join(', ')}</> : 'Bạn là Sói duy nhất.'}
      </Line>
    );
  }
  // Tay sai biết bầy Sói (rules §11.4).
  if (role === 'minion') {
    const pack = wolfIds(ctx.table);
    out.push(
      <Line key="pack" icon="werewolf" data-ww-minion-pack="">
        Bầy Sói: {pack.length > 0 ? pack.map(name).join(', ') : '—'}
        {!compact && <span className="text-(--ww-text-2)"> (họ không biết bạn)</span>}
      </Line>
    );
  }
  // Già làng: mạng phụ (rules §11.2).
  if (role === 'elder') {
    const life = elderLifeOf(ctx.myData);
    out.push(
      <Line key="elder" icon="elder" data-ww-elder-life={life ? 'yes' : 'no'}>
        {life ? 'Bạn còn mạng phụ.' : 'Bạn đã mất mạng phụ — lần bị cắn trúng sau sẽ chết.'}
      </Line>
    );
  }
  // Cặp đôi (rules §11.5), từ Bình minh ngày 1.
  if (loversVisible(ctx.state)) {
    const lover = loverOf(ctx.table, ctx.me.id);
    if (lover) {
      const loverRole = roleOf(ctx.table, lover);
      const mixed = isLoversTeam(ctx.table);
      out.push(
        <Line key="lover" icon="lovers" data-ww-lover={lover}>
          Bạn yêu <b>{name(lover)}</b>
          {loverRole && (
            <>
              {' '}
              — {name(lover)} là <b className={roleText(loverRole)}>{ROLE_NAME[loverRole]}</b>
            </>
          )}
          .
          {!compact && (
            <span className="block text-xs text-(--ww-text-2)">
              {mixed
                ? 'Hai bạn khác phe nên thành phe Tình nhân: thắng khi chỉ còn hai bạn sống.'
                : `Cùng phe ${TEAM_NAME[ROLE_TEAM[role]]}. Một người chết thì người kia chết theo.`}
            </span>
          )}
        </Line>
      );
    }
    if (role === 'cupid') {
      const pair = loversOf(ctx.table);
      out.push(
        <Line key="cupid" icon="cupid" data-ww-cupid-pair={pair ? pair.join(',') : 'none'}>
          {pair ? (
            <>
              Bạn đã ghép đôi <b>{name(pair[0])}</b> và <b>{name(pair[1])}</b>.
            </>
          ) : (
            'Ván này không có cặp đôi.'
          )}
        </Line>
      );
    }
  }
  if (out.length === 0) return null;
  return <div className={compact ? 'mt-1 space-y-0.5' : 'mt-1.5 space-y-1'}>{out}</div>;
}
