// The editor and the markdown renderer are loaded on demand, so the map ships without CodeMirror, Lezer and
// marked (about 156 KB gzip). Warm both once the map is idle, so a lesson opens without the wait.
export function prefetchLessonAssets(): void {
  void import("./CodeEditor.svelte");
  void import("marked");
}
