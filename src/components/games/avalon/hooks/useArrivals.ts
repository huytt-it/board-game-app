'use client';

import { useState } from 'react';

const EMPTY: ReadonlySet<string> = new Set();

// The ids that ARRIVED in `ids` while this component was mounted — a vote
// that came in, a card that was played, a name added to the team. The ids
// present at the first render are never "arrivals", so a reload (or a late
// mount) shows the current state without replaying the little transition.
// This is the client-side "previous value" the plan allows for decorative
// transitions only (ux-plan 2.2); anything that carries meaning must come from
// the state and the phase clock instead.
//
// An arrival stays in the set as long as its id stays in `ids`, so the element
// keeps its class (a CSS animation is not replayed by a re-render) and a later
// arrival does not cut a running one short.
export function useArrivals(ids: readonly string[]): ReadonlySet<string> {
  const key = ids.join('|');
  const [seen, setSeen] = useState(() => ({ key, ids: new Set(ids), arrived: EMPTY }));
  if (seen.key !== key) {
    // Adjusting state while rendering: the list changed since the last render.
    const arrived = new Set<string>();
    for (const id of ids) {
      if (!seen.ids.has(id) || seen.arrived.has(id)) arrived.add(id);
    }
    setSeen({ key, ids: new Set(ids), arrived });
  }
  return seen.arrived;
}
