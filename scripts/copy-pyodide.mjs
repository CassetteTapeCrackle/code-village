// Copy Pyodide's core files next to the app so it runs offline and from any static host, and fetch the
// World 3 libraries (NumPy, pandas, scikit-learn and what they need) once, checked against the lock's sha256.
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const files = [
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide.mjs",
  "pyodide-lock.json",
];
mkdirSync("public/pyodide", { recursive: true });
for (const f of files) cpSync(`node_modules/pyodide/${f}`, `public/pyodide/${f}`);

const LIBRARIES = ["numpy", "pandas", "scikit-learn"];
const lock = JSON.parse(readFileSync("node_modules/pyodide/pyodide-lock.json", "utf8"));
const version = JSON.parse(readFileSync("node_modules/pyodide/package.json", "utf8")).version;
const CACHE = "node_modules/.cache/pyodide-wheels";
mkdirSync(CACHE, { recursive: true });

// The libraries and everything they depend on, from the lock file.
const needed = new Set();
const walk = (name) => {
  const key = name.toLowerCase();
  if (needed.has(key)) return;
  if (!lock.packages[key]) throw new Error(`pyodide: ${key} is not in the lock file`);
  needed.add(key);
  for (const dep of lock.packages[key].depends ?? []) walk(dep);
};
LIBRARIES.forEach(walk);

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
let fetched = 0;
for (const key of needed) {
  const { file_name: file, sha256: expected } = lock.packages[key];
  const cached = `${CACHE}/${file}`;
  if (!existsSync(cached) || sha256(readFileSync(cached)) !== expected) {
    const url = `https://cdn.jsdelivr.net/pyodide/v${version}/full/${file}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`pyodide: ${url} answered ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (sha256(bytes) !== expected) throw new Error(`pyodide: ${file} does not match the lock's sha256`);
    writeFileSync(cached, bytes);
    fetched++;
  }
  cpSync(cached, `public/pyodide/${file}`);
}
console.log(
  `pyodide: copied ${files.length} files and ${needed.size} library wheels (${fetched} downloaded) to public/pyodide`,
);
