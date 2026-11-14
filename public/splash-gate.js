// Runs in <head> before the first paint: a tab that already saw the splash (a reload) never shows it again.
try {
  if (sessionStorage.getItem("code-village/splash-seen")) document.documentElement.classList.add("splash-seen");
} catch {
  // storage is blocked: the splash shows on every load
}
