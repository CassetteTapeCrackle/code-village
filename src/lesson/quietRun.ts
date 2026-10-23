// What Run says when the code ran fine but printed nothing: a task that only defines a function shows an
// empty box otherwise, which reads as "Run is broken".
export function quietRunNote(code: string, canCheck = true): string {
  const names = [...code.matchAll(/^\s*def\s+([A-Za-z_]\w*)\s*\(/gm)].map((m) => m[1]);
  const classes = [...code.matchAll(/^\s*class\s+([A-Za-z_]\w*)/gm)].map((m) => m[1]);
  const defined = [...names, ...classes];
  if (defined.length === 0) return "Your code ran without errors and printed nothing.";
  const first = defined[0];
  return `Your code ran without errors. It only defines ${defined.join(", ")}, so nothing is printed: ${canCheck ? "press Check to test it, or " : ""}add a line like print(${first}(...)) to try it.`;
}
