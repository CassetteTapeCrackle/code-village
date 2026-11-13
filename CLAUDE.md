<!-- claude-starters:rules begin -->

# Web (TypeScript) project rules

Framework: svelte (locked). Do not introduce alternative frameworks without explicit approval.

## Build & deps

- pnpm (committed pnpm-lock.yaml). Vite for dev/build. Node LTS.
- ESLint + Prettier: fix, don't disable. tsconfig `strict: true`; no implicit `any`.

## Code

- Explicit types at module boundaries; avoid `any` (use `unknown` + narrowing). Prefer `type`/discriminated unions for state.
- Small, focused modules; pure functions where possible; greppable names; early returns.
- No default exports for shared modules (named exports grep better).

## Tests

- Vitest (+ Testing Library for components). Cover new logic; regression test per bug.
- CI always runs on GitHub. On the owner's Mac, push the branch and open a PR into `dev` for the full gate
  (`pnpm content`, `pnpm test`, `pnpm test:py`, e2e); locally, run one vitest file at most. A fresh worktree
  has no generated `src/content/bundle.json`, so lint, typecheck and most component tests wait for CI too.

## Depth

- When writing or reviewing TypeScript, use the `clean-code-ts` skill. Name it explicitly.

## Commands

- Dev: pnpm dev · Build: pnpm build · Test: pnpm test
- Lint: pnpm lint · Format: pnpm format · Typecheck: pnpm typecheck

<!-- claude-starters:rules end -->
