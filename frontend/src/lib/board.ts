// Classic Monopoly proportions: the outer ring tracks (corners + tile depth) are
// wider than the 9 inner tracks, so edge cells become rectangles with room for a
// readable name + flag + price. Board stays square (same tracks on both axes).
export const OUTER_TRACK = 1.6;
const TRACK_TOTAL = 2 * OUTER_TRACK + 9;

// CSS grid-template for both columns and rows.
export const GRID_TEMPLATE = `${OUTER_TRACK}fr repeat(9,1fr) ${OUTER_TRACK}fr`;

// Maps a board position (0..39) to an 11x11 CSS-grid cell around the perimeter.
// pos 0 = bottom-right corner (SALIDA), going counter-clockwise.
export function gridCell(i: number): { row: number; col: number } {
  if (i <= 10) return { row: 11, col: 11 - i }; // bottom row (right->left)
  if (i <= 20) return { row: 11 - (i - 10), col: 1 }; // left col (bottom->top)
  if (i <= 30) return { row: 1, col: 1 + (i - 20) }; // top row (left->right)
  return { row: 1 + (i - 30), col: 11 }; // right col (top->bottom)
}

// Centre offset (in fr units) of grid track k (1..11), honouring the wide outer tracks.
function trackCenter(k: number): number {
  if (k === 1) return OUTER_TRACK / 2;
  if (k === 11) return OUTER_TRACK + 9 + OUTER_TRACK / 2;
  return OUTER_TRACK + (k - 2) + 0.5;
}

// Centre of a tile as a percentage of the board (for the token overlay).
export function tileCenterPct(i: number): { x: number; y: number } {
  const { row, col } = gridCell(i);
  return { x: (trackCenter(col) / TRACK_TOTAL) * 100, y: (trackCenter(row) / TRACK_TOTAL) * 100 };
}

// Forward path of positions from `from` to `to` (exclusive/inclusive), wrapping
// at 40. Used to walk a token tile-by-tile.
export function forwardPath(from: number, to: number): number[] {
  const steps = (to - from + 40) % 40;
  const path: number[] = [];
  for (let s = 1; s <= steps; s++) path.push((from + s) % 40);
  return path;
}

export const GROUP_LABEL: Record<string, string> = {
  BROWN: 'Económico',
  LIGHT_BLUE: 'Bajo/Medio',
  PINK: 'Medio',
  ORANGE: 'Medio/Alto',
  RED: 'Alto',
  YELLOW: 'Premium',
  GREEN: 'Ultra Premium',
  DARK_BLUE: 'Máximo valor',
};

// Side each tile leans against, so the colour bar faces the board centre.
export function tileSide(i: number): 'bottom' | 'left' | 'top' | 'right' {
  if (i < 10) return 'bottom';
  if (i < 20) return 'left';
  if (i < 30) return 'top';
  return 'right';
}
