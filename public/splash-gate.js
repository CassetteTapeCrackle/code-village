// Runs in <head> before the first paint: a tab that already saw the splash (a reload) never shows it again.
// Under automation the splash never takes a click, so tests can click the village right after load.
if (navigator.webdriver) document.documentElement.classList.add("splash-automated");
try {
  if (sessionStorage.getItem("code-village/splash-seen"))
    document.documentElement.classList.add("splash-seen");
} catch {
  // storage is blocked: the splash shows on every load
}
