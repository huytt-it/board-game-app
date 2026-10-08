// Camelot as seen at the end of the game, shared by the dawn (end-good) and
// the burning city (end-evil) so both endings show the same castle. Centred
// on x = 800 so it reads on a narrow phone too. Every shape is wound
// clockwise, so overlapping towers and walls merge in one path.

const merlons = (x0: number, x1: number, top: number, skip?: (i: number) => boolean) => {
  let d = '';
  for (let x = x0, i = 0; x + 16 <= x1; x += 30, i++) if (!skip?.(i)) d += `M${x} ${top}v-14h16v14z`;
  return d;
};

// A tower: square body, then either a conical roof with a pennant or (broken)
// a jagged stump.
const tower = (x: number, w: number, top: number, roofH: number, broken: boolean, base = 700) => {
  const body = `M${x - w / 2} ${base}V${top}H${x + w / 2}V${base}Z`;
  if (broken) {
    const s = w / 6;
    return (
      body +
      `M${x - w / 2} ${top + 1}L${x - w / 2} ${top - 14}L${x - w / 2 + s} ${top - 4}L${x - w / 2 + 2 * s} ${top - 22}L${x} ${top - 8}` +
      `L${x + s} ${top - 18}L${x + 2 * s} ${top - 2}L${x + w / 2} ${top - 10}L${x + w / 2} ${top + 1}Z`
    );
  }
  return (
    body +
    `M${x - w / 2 - 8} ${top}L${x} ${top - roofH}L${x + w / 2 + 8} ${top}Z` +
    `M${x - 1.5} ${top - roofH}v-30h3v30z` +
    `M${x + 1.5} ${top - roofH - 30}l24 7-24 7z`
  );
};

const win = (x: number, y: number, h = 18) => `M${x - 4} ${y + h}V${y + 4}a4 4 0 0 1 8 0V${y + h}Z`;

export function camelot(broken: boolean): { body: string; windows: string } {
  const body =
    // keep and gatehouse
    `M690 700V400H910V700Z` +
    merlons(692, 910, 400, broken ? (i) => i === 2 || i === 3 : undefined) +
    // curtain wall
    `M500 700V560H1100V700Z` +
    merlons(502, 1100, 560, broken ? (i) => i % 5 === 3 || i === 12 : undefined) +
    // outer walls
    `M360 712V610H500V712ZM1100 712V610H1240V712Z` +
    merlons(362, 500, 610) +
    merlons(1102, 1240, 610) +
    // spire, side towers, corner towers
    tower(800, 64, 270, 120, broken) +
    tower(600, 70, 410, 100, false) +
    tower(1000, 70, 424, 96, broken) +
    tower(470, 54, 520, 78, false, 712) +
    tower(1130, 54, 520, 78, false, 712) +
    tower(366, 44, 580, 64, false, 712) +
    tower(1234, 44, 580, 64, broken, 712);
  const windows = [
    win(800, 300),
    win(800, 350),
    win(740, 450),
    win(860, 450),
    win(740, 520),
    win(860, 520),
    win(600, 450),
    win(1000, 466),
    win(470, 552),
    win(1130, 552),
    win(560, 610),
    win(1040, 610),
  ].join('');
  return { body, windows };
}

// The gate: a pointed arch in the gatehouse.
export const CAMELOT_GATE = 'M770 700V640C770 616 786 600 800 590C814 600 830 616 830 640V700Z';
