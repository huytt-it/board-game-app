// Phase deadlines are shared between devices, so they must not depend on each
// device's own (possibly wrong) clock. serverNow() is the web server's clock,
// measured once via /api/time and corrected for the request round trip.
let offsetMs = 0;

export function serverNow(): number {
  return Date.now() + offsetMs;
}

export async function syncServerClock(): Promise<void> {
  try {
    const t0 = Date.now();
    const res = await fetch('/api/time', { cache: 'no-store' });
    const t1 = Date.now();
    const { now } = (await res.json()) as { now: number };
    offsetMs = Math.round(now - (t0 + t1) / 2);
  } catch {
    // Offline or endpoint unavailable: keep the previous offset.
  }
}

// Start measuring as soon as the client bundle loads.
if (typeof window !== 'undefined') {
  syncServerClock();
}
