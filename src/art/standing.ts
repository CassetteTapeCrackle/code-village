// Standing objects: things on the map a walker can pass behind (trees, houses, lamps, scenes). The static pass
// draws each one a second time inside a capture, and its picture is kept with its feet (its bottom row), so each
// frame can redraw whatever stands in front of a walker over it.
export type Box = { x: number; y: number; w: number; h: number };
export type Piece = Box & { feet: number; data: Uint8ClampedArray };

let capture: { x0: number; y0: number; x1: number; y1: number } | null = null;

export function beginCapture(): void {
  capture = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
}

// The box of everything drawn since beginCapture, in canvas pixels, or null when nothing was drawn.
export function endCapture(): Box | null {
  const b = capture;
  capture = null;
  if (!b || b.x1 < b.x0) return null;
  return { x: b.x0, y: b.y0, w: b.x1 - b.x0 + 1, h: b.y1 - b.y0 + 1 };
}

export function capturing(): boolean {
  return capture !== null;
}

// Called by the drawing primitives with the canvas pixels they set.
export function touch(x: number, y: number, w = 1, h = 1): void {
  if (!capture) return;
  capture.x0 = Math.min(capture.x0, Math.floor(x));
  capture.y0 = Math.min(capture.y0, Math.floor(y));
  capture.x1 = Math.max(capture.x1, Math.ceil(x + w) - 1);
  capture.y1 = Math.max(capture.y1, Math.ceil(y + h) - 1);
}

const REACH = 2; // pixels up to this far apart (a 1 px gap) belong to the same piece

// Splits an RGBA picture at (ox, oy) into its separate pieces, each with its own picture and feet.
export function pieces(data: Uint8ClampedArray, w: number, h: number, ox: number, oy: number): Piece[] {
  const seen = new Uint8Array(w * h);
  const out: Piece[] = [];
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || data[start * 4 + 3] === 0) continue;
    const members: number[] = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length > 0) {
      const i = stack.pop()!;
      members.push(i);
      const x = i % w;
      const y = (i - x) / w;
      for (let dy = -REACH; dy <= REACH; dy++) {
        for (let dx = -REACH; dx <= REACH; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (seen[j] || data[j * 4 + 3] === 0) continue;
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
    out.push(cut(data, w, members, ox, oy));
  }
  return out;
}

function cut(data: Uint8ClampedArray, w: number, members: readonly number[], ox: number, oy: number): Piece {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const i of members) {
    const x = i % w;
    const y = (i - x) / w;
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  const pw = x1 - x0 + 1;
  const ph = y1 - y0 + 1;
  const own = new Uint8ClampedArray(pw * ph * 4);
  for (const i of members) {
    const x = i % w;
    const y = (i - x) / w;
    own.set(data.subarray(i * 4, i * 4 + 4), ((y - y0) * pw + (x - x0)) * 4);
  }
  return { x: ox + x0, y: oy + y0, w: pw, h: ph, feet: oy + y1, data: own };
}

// The objects to redraw over a walker in `box` whose feet are on row `feet`: those overlapping it and standing lower.
export function covering<T extends Box & { feet: number }>(
  objects: readonly T[],
  box: Box,
  feet: number,
): T[] {
  return objects.filter(
    (o) =>
      o.feet > feet && o.x < box.x + box.w && o.x + o.w > box.x && o.y < box.y + box.h && o.y + o.h > box.y,
  );
}

// Draws a piece back onto the map; its picture becomes a small canvas the first time it is needed.
const pictures = new WeakMap<Piece, HTMLCanvasElement>();
export function drawPiece(ctx: CanvasRenderingContext2D, piece: Piece): void {
  let picture = pictures.get(piece);
  if (!picture) {
    picture = document.createElement("canvas");
    picture.width = piece.w;
    picture.height = piece.h;
    picture
      .getContext("2d")
      ?.putImageData(new ImageData(new Uint8ClampedArray(piece.data), piece.w, piece.h), 0, 0);
    pictures.set(piece, picture);
  }
  ctx.drawImage(picture, piece.x, piece.y);
}
