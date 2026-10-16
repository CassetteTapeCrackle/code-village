"""Write the app icons (PNG) from the Mochi sprite grid in src/art/sprites.ts.

Stdlib only: a tiny PNG encoder (zlib + CRC chunks). Run: python3 tools/make_icons.py
"""

import json
import re
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKGROUND = (0xEE, 0xF0, 0xE2, 255)  # the day page colour


def sprite(name):
    source = (ROOT / "src/art/sprites.ts").read_text()
    block = re.search(rf"export const {name}: Grid = \[(.*?)\];", source, re.S).group(1)
    return re.findall(r'"([^"]+)"', block)


def day_colors():
    sprite = json.loads((ROOT / "src/styles/palette.json").read_text())["day"]["sprite"]
    return {k: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,) for k, h in sprite.items()}


def png(width, height, pixels):
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
    raw = b"".join(b"\0" + bytes(c for px in row for c in px) for row in pixels)
    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


def icon(size, scale):
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
