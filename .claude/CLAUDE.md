# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Talisman is a multi-chain crypto wallet browser extension supporting Ethereum, Polkadot/Substrate, and Solana networks. Security and privacy are paramount - the codebase handles mnemonics, private keys, and sensitive user data.

## Common Commands

```bash
# Development
pnpm install              # Install dependencies (requires Node >= 20, corepack enable)
pnpm dev:extension        # Start Chrome extension dev server with hot reload
pnpm dev:extension:firefox # Start Firefox extension dev server

# Building
pnpm build:extension      # Build for Chrome (QA/dev)
pnpm build:extension:firefox # Build for Firefox
pnpm build:extension:prod # Production build (requires Sentry keys)

# Testing
pnpm test                 # Run Jest tests (workspace-wide)
pnpm test:e2e             # Run Playwright E2E tests
pnpm test:e2e:ui          # Run E2E tests with UI
pnpm lint                 # Run ESLint (--max-warnings 0)

# I18n
pnpm chore:update-translations  # Update translation files after adding new i18n keys

# Versioning
pnpm changeset            # Create a changeset for modified packages
```

## Architecture

### Monorepo Structure

- **apps/extension**: Main browser extension (popup, dashboard, onboarding, background service worker)
- **packages/extension-core**: Backend logic running in service worker - handles accounts, signing, keyring, transactions
- **packages/extension-shared**: Shared types/utilities between extension and core
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

### Balance Modules Pattern

Balance modules in `packages/balances/src/modules/` follow a consistent structure:

- `config.ts`, `types.ts` - Configuration and type definitions
- `fetchTokens.ts` - Token discovery
- `fetchBalances.ts`, `subscribeBalances.ts` - Balance retrieval
- `getMiniMetadata.ts` - Metadata extraction
- `getTransferCallData.ts` - Transfer transaction building

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
