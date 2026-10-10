'use client';

import { useEffect, useState } from 'react';

// Who came and went in the lobby, seen from this client: the previous player
// list is kept and compared with the new one. Decorative only (ux-plan 2.2) —
// the list present at the first render is the baseline, so loading the page
// (or a reload) announces nobody.

type Seat = { id: string; name: string };

/** Players who just left, with the seat index they had: drawn a moment
 *  longer so their seat can fade out (LobbyRoundTable). */
export function useDepartures<T extends Seat>(list: readonly T[], ms = 700): { item: T; index: number }[] {
  const key = list.map((p) => p.id).join('|');
  const [st, setSt] = useState(() => ({ key, prev: list, ghosts: [] as { item: T; index: number }[] }));
  if (st.key !== key) {
    // Adjusting state while rendering: the list changed since the last render.
    const ids = new Set(list.map((p) => p.id));
    const gone = st.prev.map((item, index) => ({ item, index })).filter((g) => !ids.has(g.item.id));
    setSt({ key, prev: list, ghosts: [...st.ghosts.filter((g) => !ids.has(g.item.id)), ...gone] });
  }
  useEffect(() => {
    if (st.ghosts.length === 0) return;
    const t = setTimeout(() => setSt((s) => ({ ...s, ghosts: [] })), ms);
    return () => clearTimeout(t);
  }, [st.ghosts, ms]);
  return st.ghosts;
}

export interface RosterNotice {
  id: number;
  kind: 'join' | 'leave';
  playerId: string;
  name: string;
}

/** Short notices "<Tên> đã vào phòng" / "… đã rời phòng" while `active`
 *  (the lobby). Each stays ~3 s; at most three at a time. */
export function useRosterNotices(list: readonly Seat[], active: boolean): RosterNotice[] {
  const key = list.map((p) => p.id).join('|');
  const [st, setSt] = useState(() => ({ key, prev: list, seq: 0, notices: [] as RosterNotice[] }));
  if (st.key !== key) {
    // Adjusting state while rendering: someone joined or left.
    const now = new Set(list.map((p) => p.id));
    const before = new Set(st.prev.map((p) => p.id));
    let seq = st.seq;
    const fresh: RosterNotice[] = [];
    if (active) {
      for (const p of list) if (!before.has(p.id)) fresh.push({ id: ++seq, kind: 'join', playerId: p.id, name: p.name });
      for (const p of st.prev) if (!now.has(p.id)) fresh.push({ id: ++seq, kind: 'leave', playerId: p.id, name: p.name });
    }
    setSt({ key, prev: list, seq, notices: [...st.notices, ...fresh].slice(-3) });
  }
  useEffect(() => {
    if (st.notices.length === 0) return;
    const t = setTimeout(() => setSt((s) => ({ ...s, notices: s.notices.slice(1) })), 3000);
    return () => clearTimeout(t);
  }, [st.notices]);
  return active ? st.notices : [];
}
