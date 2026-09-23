# Extension Architecture

> How the Talisman browser extension is built — a guide for humans and AI agents.

## High-Level Layers

```
┌─────────────────────────────────────────────────────────┐
│                    entrypoints/                          │
│  WXT entry files: background, content, page,            │
│  popup, dashboard, onboarding, support                  │
└──────┬──────────────────────────────────────────────────┘
       │ bootstraps
       ▼
┌──────────────────────┐      ┌───────────────────────────┐
│       src/ui/         │◄────│       src/common/          │
│  React frontend       │     │  Shared config, logging,   │
│  (popup, dashboard,   │     │  message services,         │
│   onboard, support)   │     │  constants                 │
└──────┬───────────────┘      └──────────┬────────────────┘
       │ IPC messages                     │
       │ (PortMessageService)             │
       ▼                                  │
┌──────────────────────┐                  │
│      src/core/        │◄────────────────┘
│  Background service   │
│  worker: handlers,    │
│  domains, DB, RPCs    │
└──────────────────────┘

┌──────────────────────┐
│     src/inject/       │
│  Content-script       │  Injected into web pages.
│  wallet provider      │  Communicates with core via
│  (ethereum, substrate,│  content script relay.
│   solana)             │
└──────────────────────┘
```

### Import rules

| From ↓ \ To → | `common` | `core` | `ui` | `inject` |
|----------------|----------|--------|------|----------|
| **common**     | ✅       | types only | ❌   | ❌       |
| **core**       | ✅       | ✅     | ❌   | ❌       |
| **ui**         | ✅       | ✅     | ✅   | ❌       |
| **inject**     | ✅       | types only | ❌ | ✅     |

- `core` never imports from `ui` — the background service worker has no React.
- `common` imports from `core` only for type definitions (`@core/types`), e.g. message protocol types used by `PortMessageService`.
- `ui` imports from `core`: types, a domain's `exports.ts` and helpers, `core/util`, and the store singletons shared through chrome.storage and IndexedDB (e.g. `appStore`, `settingsStore`, `activeTokensStore`, the Dexie `db`). It imports only types from `core/handlers`, `core/libs` and `core/rpcs`.
- `inject` imports from `core` only for type definitions.

### Path aliases (tsconfig.json)

```
@common  → ./src/common
@core    → ./src/core
@ui      → ./src/ui
inject/* → ./src/inject/*
```

## Entrypoints → Apps Mapping

The `entrypoints/` folder contains [WXT](https://wxt.dev/) entry files that bootstrap each extension surface. Each maps to a React app tree in `src/ui/apps/`:

| Entrypoint                    | UI App              | Surface                          |
|-------------------------------|---------------------|----------------------------------|
| `entrypoints/background.ts`  | —                   | Service worker (no UI)           |
| `entrypoints/content.ts`     | —                   | Content script relay (no UI)     |
| `entrypoints/page.ts`        | —                   | Injected page script (no UI)     |
| `entrypoints/popup/main.tsx` | `ui/apps/popup/`    | Browser action popup (400×600)   |
| `entrypoints/dashboard/`     | `ui/apps/dashboard/`| Full-page wallet dashboard       |
| `entrypoints/onboarding/`    | `ui/apps/onboard/`  | First-time setup wizard          |
| `entrypoints/support/`       | `ui/apps/support/`  | Support/diagnostics page         |

Entrypoints handle platform-level setup (imports, zoom, sizing), then render the corresponding React app.

## Data Flow

```
┌──────────┐  handler.handle()  ┌───────────┐  PortMessageService  ┌──────────┐
│  core/   │◄──────────────────│  core/     │◄─────────────────────│  ui/api/  │
│  domains │                    │  handlers/ │                      │  api.ts   │
│  (logic) │                    │  Extension │                      │          │
└──────────┘                    └───────────┘                       └────┬─────┘
                                                                         │
     RxJS Observable + @react-rxjs/core bind()                          │
┌──────────┐    useXyz() hooks    ┌──────────┐    api.xyzSubscribe()   │
│  ui/     │◄────────────────────│  ui/      │◄────────────────────────┘
│  domains │                      │  state/   │
│  (React) │                      │  *.ts     │
└──────────┘                      └──────────┘
```

1. **`core/domains/`** — Business logic: database access, RPC calls, crypto operations.
2. **`core/handlers/Extension.ts`** — Routes incoming messages to domain handlers by prefix (e.g., `"pri(accounts.*)"` → `AccountsHandler`).
3. **`ui/api/api.ts`** — The UI's bridge to core. Sends messages via `PortMessageService` and exposes typed methods.
4. **`ui/state/`** — Wraps `api` subscriptions, or a shared core store (e.g. `remoteConfigStore`), as RxJS Observables, then uses `@react-rxjs/core`'s `bind()` to produce React hooks (e.g., `useAccounts`, `useBalances`). Cross-domain state only.
5. **`ui/hooks/`** — Higher-level React hooks that combine state hooks with UI logic (e.g., formatting, derived state, navigation).
6. **`ui/domains/`** — Feature-specific React components, organized by business domain.
7. **`ui/apps/`** — App shells (routing, layout) that compose domain components.

## Core Layer (`src/core/`)

```
core/
├── background.ts       — Service worker initialization entry point
├── config/             — Sentry configuration
├── db/                 — Dexie (IndexedDB) schema, migrations, blob storage
├── domains/            — Business logic grouped by domain (camelCase)
│   ├── accounts/       — Account CRUD, catalog, on-chain IDs
│   ├── app/            — Auth, session, password, remote config stores
│   ├── balances/       — Balance subscriptions and aggregation
│   ├── bittensor/      — Bittensor chain interactions
│   ├── chaindata/      — Chain metadata management
│   ├── earn/           — Staking/yield farming logic
│   ├── ethereum/       — EVM contract interactions, gas estimation
│   ├── keyring/        — Key management, derivation, encryption (🔴 SECURITY-CRITICAL)
│   ├── mnemonics/      — Mnemonic generation, backup, verification (🔴 SECURITY-CRITICAL)
│   ├── signing/        — Sign request queue for all platforms; approves Polkadot SDK and VRF requests
│   │                     (Ethereum and Solana approvals live in their own domains) (🔴 SECURITY-CRITICAL)
│   └── ...             — one folder per domain (`ls src/core/domains`)
├── handlers/           — Message routing. Extension.ts routes `pri(...)` messages to domain handlers,
│                         Tabs.ts routes `pub(...)` dapp messages, index.ts exports `talismanHandler`
├── libs/               — Handler base classes, Store (chrome.storage), Analytics, GeneralReport (daily
│                         usage report), requests/ (RequestStore), migrations/, QrGenerator/ (Polkadot
│                         Vault payloads), WindowManager, IconManager, isWalletReady, uiOpenState
├── notifications/      — Browser notification creation and click handling
├── rpcs/               — Chain connector instantiation (EVM, Substrate, Solana)
├── types/              — Message protocol type definitions
└── util/               — Helpers with no domain affinity (crypto, ABI, contract data, RPC calls)
```

### Core domain anatomy

Each core domain typically has:
- `handler.ts` — Extends `ExtensionHandler`, routes wallet UI messages (`pri(...)`) to methods. The `ethereum` and `solana` domains split it: `handler.extension.ts` for wallet UI messages, `handler.tabs.ts` (extends `TabsHandler`) for dapp messages (`pub(...)`). The Polkadot dapp handler is `core/handlers/Tabs.ts`.
- `types.ts` — Request/response type definitions for messages
- `index.ts` — Exports handler + any stores (not a barrel — exports named items used elsewhere)
- `exports.ts` — In some domains (e.g. `keyring`, `bittensor`, `earn`): the UI-safe surface, helpers and types that `ui/` may import without pulling in handlers
- `store.ts` / `store.*.ts` — Persistent stores (Dexie tables or chrome.storage key-value stores)
- `helpers.ts` — Pure utility functions
- Tests — colocated `*.test.ts` / `*.spec.ts`, or in `__tests__/`

## UI Layer (`src/ui/`)

```
ui/
├── api/                — `api` object (api.ts, typed in types.ts): the message bridge to core. Not an HTTP API
├── apps/               — App shells for each extension surface
│   ├── popup/          — Popup layout, pages, routing
│   ├── dashboard/      — Dashboard layout, routes
│   ├── onboard/        — Onboarding wizard layout, routes
│   └── support/        — Support/diagnostics page
├── components/         — Shared UI primitives (Button, Modal, Tabs, Drawer...)
├── domains/            — Feature-specific components (PascalCase, see below)
├── hooks/              — Cross-cutting React hooks (used in 2+ domains)
├── state/              — RxJS observables → React hooks via @react-rxjs/core
├── styles/             — Global CSS
├── theme/              — Image and logo assets
└── util/               — Frontend-only helpers (formatting, image handling, etc.)
```

### UI domain anatomy (recommended structure)

Larger domains should use this internal structure:

```
domains/
└── {DomainName}/           — PascalCase (e.g., SendFunds, Portfolio, Sign)
    ├── components/         — Reusable components scoped to this domain
    ├── hooks/              — Domain-specific React hooks
    ├── shared/             — Utilities, helpers, constants shared within the domain
    ├── types.ts            — Domain-specific TypeScript types
    ├── {Feature}/          — Sub-features (e.g., Sign/Ethereum/, Staking/Bond/)
    │   ├── components/
    │   └── hooks/
    └── *.tsx               — Page-level or orchestration components
```

Smaller domains (< 10 files) can be flat — no need to over-structure a handful of files.

### Where does code go?

| Code type | Location | Rule |
|-----------|----------|------|
| Shared UI primitive (Button, Modal) | `ui/components/` | Used in 3+ domains |
| Domain-specific component | `ui/domains/{Domain}/` | Used within one domain |
| Cross-cutting React hook | `ui/hooks/` | Used in 2+ domains |
| Domain-specific hook | `ui/domains/{Domain}/hooks/` | Used within one domain |
| Global reactive state (RxJS) | `ui/state/` | Cross-domain observable streams |
| Domain-specific state | `ui/domains/{Domain}/` (a `provideContext` provider or hooks) | Used by one domain only |
| Frontend utility function | `ui/util/` | No domain affinity |
| Background business logic | `core/domains/{domain}/` | Runs in service worker |
| Backend utility function | `core/util/` | No domain affinity |
| Shared between core & UI | `common/` | Config, constants, logging, message services |

## Naming Conventions

| Layer | Folder casing | File casing | Rationale |
|-------|--------------|-------------|-----------|
| `core/domains/` | camelCase (`accounts`, `sendFunds`) | camelCase/kebab | Backend convention |
| `ui/domains/` | PascalCase (`Account`, `SendFunds`) | PascalCase for components, camelCase for hooks/utils | React convention |
| `ui/components/` | PascalCase | PascalCase `.tsx` | React convention |
| `ui/hooks/` | — | `use*.ts` | React hook convention |
| `ui/state/` | — | camelCase `.ts` | Data layer, not components |

The case difference between `core/domains/accounts` and `ui/domains/Account` is intentional — it reflects the different conventions of each layer.

Folder casing applies to top-level domain folders. Sub-feature folders are often lowercase or kebab-case (e.g. `Earn/yieldxyz`, `Swap/swap-modules`, `core/domains/app/remote-config`).

## Inject Layer (`src/inject/`)

Wallet provider injection for web pages:

```
inject/
├── shared/         — Shared injection utilities
├── ethereum/       — EIP-1193 provider (window.ethereum / window.talismanEth)
├── substrate/      — Polkadot.js-compatible provider (window.injectedWeb3)
└── solana/         — Solana wallet adapter provider
```

Content script (`entrypoints/content.ts`) relays messages between injected page scripts and the background service worker via `chrome.runtime.Port`.

## Common Layer (`src/common/`)

Small but critical shared configuration:

- `constants.ts` — Port names, environment flags (`DEBUG`, `TEST`, `IS_FIREFOX`), API and docs URLs. Feature flags come from remote config (`core/domains/app/store.remoteConfig.ts`).
- `enableAnyloggerLogsInDevelopment.ts` — Shows `@talismn/*` package logs (anylogger) in development builds
- `i18nConfig.ts` — i18next setup
- `i18nSharedConfig.ts` — Settings shared by the i18next runtime and the string extractor
- `log.ts` — Console logging wrapper, silent in tests
- `PortMessageService.ts` — Chrome extension port communication
- `WindowMessageService.ts` — Window postMessage communication
- `zodConfig.ts` — Zod schema defaults

## Key Architectural Patterns

### Message-based IPC
Core and UI communicate via typed messages over `chrome.runtime.Port`. The exception is state shared through chrome.storage and IndexedDB: the UI reads some core stores and the Dexie `db` directly. The message protocol is defined in `core/types/` with string keys like `"pri(accounts.subscribe)"`. This enforces a clean boundary and makes the extension work across the process isolation of browser extensions.

### RxJS + @react-rxjs/core
State management uses RxJS observables in `ui/state/`, bridged to React via `@react-rxjs/core`'s `bind()`. This pattern allows the same reactive streams to be composed, filtered, and shared across components without prop drilling or context providers.

### provideContext
When React context is needed (wizards, multi-step flows), use the `provideContext` utility from `ui/util/provideContext.tsx`. This avoids boilerplate context/provider pair creation.

### No new barrel files
Do not add `index.ts` barrel re-exports. Import directly from the source module (e.g., `@ui/domains/Portfolio/PortfolioContainer`, not `@ui/domains/Portfolio`). This helps tree-shaking and keeps dependency graphs explicit. Some barrels already exist (e.g. `@ui/api`, `@ui/components/Notifications`, `core/db`); import from them as other code does.

## Other Folders

- `src/__tests__/` — Guard tests that scan the source for banned patterns (e.g. `instanceof` on classes that bundles can duplicate)
- `src/types/` — Ambient `.d.ts` declarations (i18next, SVG imports)
- `src/sentry.ts` — Sentry setup for the UI surfaces
- `tests/` — Vitest setup files, mocks and fixtures
