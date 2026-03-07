# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Talisman is a multi-chain crypto wallet browser extension supporting Ethereum, Polkadot/Substrate, and Solana networks. Security and privacy are paramount - the codebase handles mnemonics, private keys, and sensitive user data.

## Architecture

### Monorepo Structure

- **apps/balances-bench**: Developer utility CLI to help with balance modules development
- **apps/balances-demo**: Developer utility website to help with balance modules development
- **apps/extension**: Main browser extension (popup, dashboard, onboarding, background service worker)
- **apps/extension**: Main browser extension (popup, dashboard, onboarding, background service worker)
- **packages/balances**: Multi-chain balance fetching with pluggable modules (EVM, Substrate, Solana)
- **packages/chaindata-provider**: Chain metadata and configuration
- **packages/keyring**: Key management and encryption
- **packages/crypto**: Cryptographic utilities

### Extension Entry Points

- `apps/extension/src/background.ts` → Service worker entry
- `apps/extension/src/index.popup.tsx` → Popup UI
- `apps/extension/src/index.dashboard.tsx` → Full-page dashboard
- `apps/extension/src/inject/` → Injected provider scripts (Ethereum, Substrate, Solana)

### State Management

- **RxJS + @react-rxjs/core**: Primary state management for logic that runs in both UI and service worker
- **Dexie**: IndexedDB wrapper for persistent storage
- React local state for purely local UI concerns

## Key Technical Guidelines

### Dependencies

- Prefer native browser/Node APIs (`fetch`, `crypto`) over legacy polyfills
- Use `polkadot-api` over `@polkadot/api` (WASM-heavy)
- Avoid `axios` - use `fetch`
- Check existing workspace packages before adding new dependencies

### Security Requirements

- Never log/persist mnemonics, private keys, passwords, or portfolio data.
- Logging non-sensitive, public data for debugging (e.g. addresses, transaction hashes, chain IDs, balances) is acceptable.
- Clear sensitive data immediately after use (overwrite buffers, reset React state)
- Privacy features default to opt-in
- Any keyring/secret storage changes require dedicated unit tests

### Performance

- Use RxJS operators (`throttleTime`, `shareReplay`) to prevent subscription storms
- Lazy-load heavy UI routes
- Reuse chain connectors and respect backoff for RPC limits
- Unsubscribe RxJS streams and clear timers on unmount

### React 18 Guidelines

- Wrap expensive computations in `useMemo`
- Stabilize callbacks with `useCallback` when identity matters
- Use feature flags (`remoteConfigStore`, `FeatureFlag`) for risky functionality

### i18n

- Wrap UI strings with `t()` from `useTranslation` hook
- Use `<Trans>` component for strings with embedded React components
- Run `pnpm chore:update-translations` after adding new keys

## Testing

- Jest for unit tests: `*.spec.ts` files in `__tests__` folders
- Playwright for E2E: `playwright/e2e-tests/`
- Follow patterns in `apps/extension/src/core/handlers/Extension.spec.ts`

Before completing work, ensure `pnpm check --fix` passes, and verify that typescript code can compile using typecheck scripts.
