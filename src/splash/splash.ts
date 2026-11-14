// The wood splash written into index.html. Village calls openSplash after its first full paint; the barn doors
// open once the splash has been up SPLASH_MIN_MS, so a new tab never sees the village half drawn.
export const SPLASH_SEEN_KEY = "code-village/splash-seen";
export const SPLASH_MIN_MS = 2000;
export const SPLASH_DOORS_MS = 800;

export function splashWait(sinceStartMs: number, automated: boolean): number {
  if (automated) return 0;
  return Math.max(0, SPLASH_MIN_MS - sinceStartMs);
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function openSplash(): Promise<void> {
  const splash = document.getElementById("splash");
  if (!splash || splash.dataset.opening) return;
  // A reload: public/splash-gate.js hid the splash before the first paint, so it goes without a wait.
  if (document.documentElement.classList.contains("splash-seen")) {
    splash.remove();
    return;
  }
  splash.dataset.opening = "true";
  if ("fonts" in document) await document.fonts.ready;
  await sleep(splashWait(performance.now(), navigator.webdriver === true));
  try {
    sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
  } catch {
    // storage is blocked: a reload of this tab shows the splash again
  }
  splash.classList.add("splash-open");
  await sleep(SPLASH_DOORS_MS);
  splash.remove();
}
