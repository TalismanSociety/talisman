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
| **common**     | ✅       | ❌     | ❌   | ❌       |
| **core**       | ✅       | ✅     | ❌   | ❌       |
| **ui**         | ✅       | ✅     | ✅   | ❌       |
| **inject**     | ✅       | types only | ❌ | ✅     |

- `core` never imports from `ui` — the background service worker has no React.
- `ui` imports from `core` for type definitions and domain exports, never for runtime classes.
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
4. **`ui/state/`** — Wraps `api` subscriptions as RxJS Observables, then uses `@react-rxjs/core`'s `bind()` to produce React hooks (e.g., `useAccounts`, `useBalances`).
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
│   ├── signing/        — Transaction/message signing (🔴 SECURITY-CRITICAL)
│   └── ...             — (25 domains total)
├── handlers/           — Message routing: Extension.ts dispatches to domain handlers
├── libs/               — Singletons: Handler, Store, Analytics, RequestStore, etc.
├── notifications/      — Browser notification creation and click handling
├── rpcs/               — Chain connector instantiation (EVM, Substrate, Solana)
├── types/              — Message protocol type definitions
└── util/               — Backend-only helpers (crypto, ABI, contract data, RPC calls)
```

### Core domain anatomy

Each core domain typically has:
- `handler.ts` — Extends `ExtensionHandler`, routes message types to methods
- `types.ts` — Request/response type definitions for messages
- `index.ts` — Exports handler + any stores (not a barrel — exports named items used elsewhere)
- `store.*.ts` — Persistent stores (Dexie tables or key-value stores)
- `helpers.ts` — Pure utility functions
- `__tests__/` — Unit tests

## UI Layer (`src/ui/`)

```
ui/
├── api/                — IPC message bridge to background (PortMessageService)
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
| Domain-specific state | `ui/domains/{Domain}/state/` | Observable used by one domain only |
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

- `constants.ts` — Port names, feature flags
- `cryptoConfig.ts` — Crypto library configuration
- `i18nConfig.ts` — i18next setup
- `log.ts` — Anylogger-based logging
- `PortMessageService.ts` — Chrome extension port communication
- `WindowMessageService.ts` — Window postMessage communication
- `zodConfig.ts` — Zod schema defaults

## Key Architectural Patterns

### Message-based IPC
Core and UI communicate exclusively via typed messages over `chrome.runtime.Port`. The message protocol is defined in `core/types/` with string keys like `"pri(accounts.subscribe)"`. This enforces a clean boundary and makes the extension work across the process isolation of browser extensions.

### RxJS + @react-rxjs/core
State management uses RxJS observables in `ui/state/`, bridged to React via `@react-rxjs/core`'s `bind()`. This pattern allows the same reactive streams to be composed, filtered, and shared across components without prop drilling or context providers.

### provideContext
When React context is needed (wizards, multi-step flows), use the `provideContext` utility from `ui/util/provideContext.tsx`. This avoids boilerplate context/provider pair creation.

### No barrel files
The project does not use `index.ts` barrel re-exports. Import directly from the source module (e.g., `@ui/domains/Portfolio/PortfolioContainer`, not `@ui/domains/Portfolio`). This helps tree-shaking and keeps dependency graphs explicit.
