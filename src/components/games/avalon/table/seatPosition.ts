// Seat radius as a percentage of the table container. It sits just outside the
// table surface, which is inset 12% from the container edge.
export const SEAT_RADIUS_PCT = 43;

// Position of seat `i` of `n`, as percentages of the table container, with the
// origin at its top-left corner. Seat 0 is at 12 o'clock and seats run clockwise.
//
// Computed with sin/cos (instead of the rotate(angle) translateY(-r)
// rotate(-angle) trick) so the radius can be a % of the container —
// translateY % refers to the element itself, not the parent.
export function seatPosition(
  i: number,
  n: number,
  radiusPct: number = SEAT_RADIUS_PCT
): { x: number; y: number } {
  const angleDeg = (360 / n) * i - 90;
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: 50 + radiusPct * Math.cos(rad),
    y: 50 + radiusPct * Math.sin(rad),
  };
}
