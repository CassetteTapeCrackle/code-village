// The wood splash written into index.html. Village calls openSplash after its first full paint; the barn doors
// open once the splash has been up SPLASH_MIN_MS, so a new tab never sees the village half drawn.
export const SPLASH_SEEN_KEY = "code-village/splash-seen";
export const SPLASH_MIN_MS = 2000;
export const SPLASH_DOORS_MS = 800;
// Matches splash-give-up in splash.css: past it the splash leaves without the doors.
export const SPLASH_GIVE_UP_MS = 10_000;

export function splashWait(sinceStartMs: number, automated: boolean): number {
  if (automated) return 0;
  return Math.max(0, SPLASH_MIN_MS - sinceStartMs);
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// At the give-up the page is freed directly, not through openSplash, which may still wait on a stalled font.
function freePage(): void {
  document.getElementById("app")?.removeAttribute("inert");
  const splash = document.getElementById("splash");
  if (splash && !splash.classList.contains("splash-open")) splash.remove();
}

// Called once before the app mounts. Keyboard and screen readers stay off the village while the wood covers it,
// and the page is freed at SPLASH_GIVE_UP_MS even if the village never paints. Automated browsers are never held:
// the e2e suite clicks the village right after load.
export function holdAppBehindSplash(): void {
  setTimeout(freePage, Math.max(0, SPLASH_GIVE_UP_MS - performance.now()));
  const shown =
    document.getElementById("splash") && !document.documentElement.classList.contains("splash-seen");
  if (!shown || navigator.webdriver === true) return;
  document.getElementById("app")?.setAttribute("inert", "");
}

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
  document.getElementById("app")?.removeAttribute("inert");
  if (performance.now() >= SPLASH_GIVE_UP_MS) {
    splash.remove();
    return;
  }
  splash.classList.add("splash-open");
  await sleep(SPLASH_DOORS_MS);
  splash.remove();
}
