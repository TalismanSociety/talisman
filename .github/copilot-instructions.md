# Talisman Copilot Master Prompt

## Mission & Values

- We ship a multi-chain crypto wallet where **security, privacy, and user trust outweigh convenience**.
- Work respectfully (Contributor Covenant) and keep PRs scoped, well-tested, and well-explained (CONTRIBUTING.md).
- Everything in this monorepo is **TypeScript**; no plain JS or other languages unless explicitly required.

## Coding & Tooling Standards

- Use **Node >= 20**, `corepack enable`, and **pnpm** commands from `package.json`/`turbo.json`.
- Formatting & linting: Prettier + `@talismn/eslint-config` (`eslint --max-warnings 0`). Keep `_`-prefixed unused vars if needed.
- Write/maintain unit tests (Jest) and E2E tests (Playwright). Commands:
  - `pnpm test` (workspace-wide Jest)
  - `pnpm exec playwright test` (E2E) and variants in `package.json`
- Use `pnpm changeset` for versioned packages; respect CI expectations in `.github/workflows/ci.yml`.
- I18n: wrap UI strings with `t()`/`Trans` and run `pnpm chore:update-translations` when keys change.

## Dependency & API Guidance

**Prefer**

- Native browser/Node APIs (`fetch`, `crypto`, `AbortController`) over legacy or WASM-heavy shims (e.g., prefer `polkadot-api` to `@polkadot/api`).
- Well-known, actively maintained libraries already present in the workspace (lodash helpers, RxJS, Dexie, TanStack, etc.).
- Packages that satisfy pnpm's `minimumReleaseAge` (3 days) to avoid fresh supply-chain risk.

**Avoid**

- Adding @polkadot/api (WASM-heavy) where `polkadot-api` or existing connectors cover the use case.
- Bringing in `axios` or similar when `fetch` works.
- Novel, low-adoption dependencies, especially for trivial helpers you can implement in a few lines.
- Reusing components by mutating them into hard-to-maintain "Frankenstein" versions; create focused components instead of overloading props.
- Dependencies that increase maintenance burden or block pnpm's install constraints.

## Architecture & Reuse

- Favor **RxJS (+ @react-rxjs/core)** for state/logic that must run in both UI and service-worker contexts so we can reuse the same streams across backend and frontend; React local state is fine for purely local UI concerns.
- Reuse existing packages/modules (`@talismn/balances`, `chaindata-provider`, shared stores, UI components) before inventing new abstractions.
- Keep modules composable and documented (see `BalancesModules.md` for expectations on APIs, storage, hydration).
- Encourage `lodash-es` helpers when they keep code clear/concise.
- Ensure opt-in analytics/telemetry flows stay optional and clearly communicated (see `AnalyticsOptInInfo.tsx`).
- As we are using React 18, guard against unnecessary re-renders: wrap expensive computations in `useMemo`, stable callbacks in `useCallback`, and memoize derived props passed to child components when identity matters (without overusing them).
- When introducing risky or incremental functionality, gate it behind existing feature-flag/remote-config plumbing (`remoteConfigStore`, `FeatureFlag`) so it can be rolled out gradually or disabled instantly.
- Respect accessibility/UX guardrails: maintain keyboard/focus flows, provide ARIA labels, keep color contrast high, and ensure responsive layouts across popup, onboarding, and support surfaces.

## Performance & Footprint

- Keep the service worker and UI responsive: avoid long synchronous work on the main thread/background; use async pipelines, batching, and RxJS operators like `throttleTime`/`shareReplay` to prevent storms.
- Reuse existing caches (Dexie, shared stores, token/balance hydration) instead of refetching; prefer incremental queries and pagination for large data sets.
- Minimize bundle size impact: tree-shake imports, lazy-load heavy UI routes, and avoid introducing large dependencies for small features.
- Be mindful of connection counts and RPC usage—reuse chain connectors and respect exponential backoff to avoid exhausting browser/chain limits.
- Watch for memory leaks: unsubscribe RxJS streams, clear timers, and release references to sensitive or large objects when views unmount.

## Privacy, Security & Data Protection

- **Never log or persist secrets in plaintext (passwords, private keys, mnemonics/seed phrases, decrypted key material).** This can leak information that could directly lead to loss of user funds. Logging non-sensitive, public data for debugging (e.g. addresses, transaction hashes, chain IDs, balances) is acceptable.
- Assume every PR is a security review: choose the safest approach even if it takes longer.
- After touching sensitive data (mnemonics, passwords, seed phrases, decrypted material), **clear every reference immediately** (e.g., overwrite buffers, reset React state, drop references) even though JavaScript GC is best-effort.
- Use any necessary technical control to protect users: encryption APIs, browser secure storage, zero-knowledge patterns, permission prompts, rate-limiting, etc.
- Privacy features must default to **opt-in**, and any data sharing needs explicit informed consent.
- If an implementation could jeopardize user funds, privacy, or data integrity, stop and redesign; shipping unsafe code is never acceptable.
- When React components briefly hold mnemonics/secrets, clear state in `useEffect` cleanups or immediately after use, and avoid passing secrets deep into unrelated components.

## Error Handling & Observability

- Bubble actionable errors to users via established patterns (inline messaging, notifications) while keeping sensitive details out of the UI/logs.
- Use shared logging/telemetry utilities sparingly and only for anonymized diagnostics.
- Prefer existing retry/backoff helpers (chain connectors, fetch utilities) and avoid tight retry loops that could spam RPC providers.

## Testing & Verification Checklist

1. Re-use existing Jest/Playwright helpers when adding tests; keep mocks aligned with `apps/extension/tests`.
2. Validate new hooks/components with real APIs (RxJS streams, Dexie, background APIs) and cover race/error paths.
3. Ensure new commands/config entries work with `turbo run build` and `pnpm build:extension*` matrix.
4. Any change that touches the keyring or secret storage must ship with dedicated unit tests.

## Commenting & Documentation

- Code should be self-explanatory; add **succinct comments** only when context is non-obvious (security rationale, tricky RxJS flows, chain-specific quirks).
- Update relevant READMEs/CHANGELOGs when behavior or public APIs change; run `pnpm changeset` when packages ship new features/fixes.
- If a PR affects onboarding instructions, contribution rules, security policies, or other documented workflows, update the corresponding markdown files (README, CONTRIBUTING, CODE_OF_CONDUCT, package docs) in the same PR so they never fall out of date.

## Maintaining This Prompt

- Revisit whenever `README.md`, `CONTRIBUTING.md`, security policies, or build tooling change.
- Keep a running list of privacy/security decisions; future prompt edits should reflect lessons learned from audits, incidents, or new upstream guidance.
