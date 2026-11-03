"""Write the app icons (PNG) from the Mochi sprite grid in src/art/sprites.ts.

Stdlib only: a tiny PNG encoder (zlib + CRC chunks). Run: python3 tools/make_icons.py
"""

import json
import re
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKGROUND: tuple[int, int, int, int] = (0xEE, 0xF0, 0xE2, 255)  # the day page colour


Rgba = tuple[int, int, int, int]


def sprite(name: str) -> list[str]:
    source = (ROOT / "src/art/sprites.ts").read_text()
    found = re.search(rf"export const {name}: Grid = \[(.*?)\];", source, re.S)
    if found is None:
        raise SystemExit(f"src/art/sprites.ts has no sprite {name}")
    return re.findall(r'"([^"]+)"', found.group(1))


def day_colors() -> dict[str, Rgba]:
    sprite = json.loads((ROOT / "src/styles/palette.json").read_text())["day"]["sprite"]
    return {k: (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255) for k, h in sprite.items()}


def png(width: int, height: int, pixels: list[list[Rgba]]) -> bytes:
    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
    raw = b"".join(b"\0" + bytes(c for px in row for c in px) for row in pixels)
    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


def icon(size: int, scale: int) -> bytes:
    grid, colors = sprite("MOCHI"), day_colors()
    pixels = [[BACKGROUND] * size for _ in range(size)]
    ox = (size - len(grid[0]) * scale) // 2
    oy = (size - len(grid) * scale) // 2
    for y, row in enumerate(grid):
        for x, ch in enumerate(row):
            if ch == ".":
                continue
            for dy in range(scale):
                for dx in range(scale):
                    pixels[oy + y * scale + dy][ox + x * scale + dx] = colors[ch]
    return png(size, size, pixels)


if __name__ == "__main__":
    out = ROOT / "public" / "icons"
    out.mkdir(parents=True, exist_ok=True)
    for name, size, scale in [("icon-192.png", 192, 12), ("icon-512.png", 512, 32), ("maskable-512.png", 512, 24)]:
        (out / name).write_bytes(icon(size, scale))
        print(f"icons: wrote {name}")
