// Server clock for the Avalon phase timers (see lib/serverClock.ts).
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ now: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
}
