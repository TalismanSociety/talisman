# Extension Architecture

> How the Talisman browser extension is built — a guide for humans and AI agents. It states the rules for new code, not an inventory of the current code. Use `ls` for that.

## Layers

```
entrypoints/   WXT entry files: background, content, page, popup, dashboard, onboarding, support
src/core/      Backend: background service worker (handlers, domains, DB, RPCs). No React, no DOM.
src/ui/        Frontend: React apps for popup, dashboard, onboarding, support.
src/common/    Shared by core, ui and inject: constants, logging, message services, i18n.
src/inject/    Wallet providers injected into web pages (ethereum, substrate, solana).
```

### Import rules

| From ↓ \ To → | `common` | `core` | `ui` | `inject` |
|----------------|----------|--------|------|----------|
| **common**     | ✅       | types only | ❌   | ❌       |
| **core**       | ✅       | ✅     | ❌   | ❌       |
| **ui**         | ✅       | restricted | ✅   | ❌       |
| **inject**     | ✅       | types only | ❌   | ✅     |

- `core` never imports from `ui`: the service worker has no React.
- `ui` may import from `core`: types, a domain's `exports.ts` and `helpers.ts`, `core/util`, and the stores shared through chrome.storage and IndexedDB (e.g. `appStore`, `settingsStore`, `activeTokensStore`, the Dexie `db`). It must not import runtime code from `core/handlers`, `core/libs`, `core/rpcs` or any `handler*.ts`.
- `common` and `inject` import only types from `core` (e.g. `@core/types`).

### Path aliases (tsconfig.json)

```
@common  → ./src/common
@core    → ./src/core
@ui      → ./src/ui
inject/* → ./src/inject/*
```

## Entrypoints → Apps

| Entrypoint                    | UI App               |
|-------------------------------|----------------------|
| `entrypoints/background.ts`  | — (service worker)   |
| `entrypoints/content.ts`     | — (content script relay) |
| `entrypoints/page.ts`        | — (injected page script) |
| `entrypoints/popup/`         | `ui/apps/popup/`     |
| `entrypoints/dashboard/`     | `ui/apps/dashboard/` |
| `entrypoints/onboarding/`    | `ui/apps/onboard/`   |
| `entrypoints/support/`       | `ui/apps/support/`   |

Entrypoints do platform setup only (imports, zoom, sizing), then render the app. Put no logic there.

## Adding a backend operation

Data flows `ui/domains` → `ui/state` or `ui/hooks` → `ui/api` → `PortMessageService` → `core/handlers/Extension.ts` → `core/domains/<domain>/handler.ts`.

1. Add the request and response types to `core/domains/<domain>/types.ts`, and the message key (`"pri(<domain>.<action>)"`) to that domain's `<Domain>Messages` interface, which `core/types/index.ts` merges.
2. Handle it in the domain's `handler.ts` (`ExtensionHandler`). Dapp-facing messages (`"pub(...)"`) go in a `TabsHandler` instead (`handler.tabs.ts` in `ethereum` and `solana`, `core/handlers/Tabs.ts` for Polkadot).
3. Expose it on the `api` object in `ui/api/api.ts` and type it in `ui/api/types.ts`.
4. If the UI needs it as reactive state shared by several domains, wrap it in `ui/state/` with `@react-rxjs/core`'s `bind()`. Otherwise call `api` from a hook in the domain.

## Core (`src/core/`)

```
core/
├── db/          Dexie (IndexedDB) schema and upgrades
├── domains/     Business logic, one folder per domain (camelCase)
├── handlers/    Message routing: Extension.ts (pri), Tabs.ts (pub)
├── libs/        Base classes and singletons: Handler, Store, RequestStore, migrations
├── rpcs/        Chain connector instances (Polkadot SDK, EVM, Solana)
├── types/       Message protocol types
└── util/        Helpers with no domain affinity
```

`keyring/`, `mnemonics/` and `signing/` are security-critical. Change them with care and with tests.

### Core domain layout

A domain has only the files it needs:

- `handler.ts` — extends `ExtensionHandler`. Never imported by `ui/`.
- `types.ts` — request and response types.
- `store.ts` / `store.<name>.ts` — persistent state: a `Store` (chrome.storage) or a Dexie table.
- `helpers.ts` — pure functions.
- `exports.ts` — what `ui/` may import when the domain has more than helpers and types to share. It must not import `handler*.ts`.
- `migrations/` — data migrations for the domain's stores. `legacy/` — old stores that only migrations read.
- Tests colocated as `*.test.ts` or `*.spec.ts`, or in `__tests__/`.

Do not add an `index.ts`. Import the file you need.

## UI (`src/ui/`)

```
ui/
├── api/          The `api` object: typed message bridge to core. Not an HTTP API
├── apps/         App shells (routing, layout) for popup, dashboard, onboard, support
├── components/   Shared UI primitives (Button, Modal, Drawer...)
├── domains/      Feature components by business domain (PascalCase)
├── hooks/        Cross-cutting React hooks
├── state/        Cross-domain reactive state (RxJS → hooks)
├── styles/       Global CSS
├── theme/        Image and logo assets
└── util/         Frontend-only helpers
```

### UI domain layout

Larger domains use this structure. Domains under about 10 files stay flat.

```
domains/{DomainName}/
├── components/     Components scoped to this domain
├── hooks/          Domain-specific hooks
├── shared/         Utilities, constants shared within the domain
├── types.ts
├── {Feature}/      Sub-features, same layout one level down
└── *.tsx           Page-level or orchestration components
```

### Where does code go?

| Code type | Location | Rule |
|-----------|----------|------|
| UI primitive (Button, Modal) | `ui/components/` | Used by 2+ domains |
| Domain component | `ui/domains/{Domain}/` | Used by one domain |
| React hook | `ui/hooks/` | Used by 2+ domains |
| Domain hook | `ui/domains/{Domain}/hooks/` | Used by one domain |
| Reactive state (RxJS) | `ui/state/` | Read by 2+ domains |
| Domain state | `ui/domains/{Domain}/` | A `provideContext` provider or hooks |
| Frontend helper | `ui/util/` | No domain affinity |
| Business logic | `core/domains/{domain}/` | Runs in the service worker |
| Backend helper | `core/util/` | No domain affinity |
| Needed by core and ui, or by inject | `common/` | Config, constants, logging, message services. No React, no handlers |

Move code up a level only when a second consumer appears. Do not pre-emptively generalise.

## Naming

| Layer | Folder casing | File casing |
|-------|--------------|-------------|
| `core/domains/` | camelCase (`accounts`, `sendFunds`) | camelCase or kebab-case |
| `ui/domains/`, `ui/components/` | PascalCase (`Account`, `SendFunds`) | PascalCase for components, camelCase for hooks and utils |
| `ui/hooks/` | — | `use*.ts` |
| `ui/state/` | — | camelCase `.ts` |

The case difference between `core/domains/accounts` and `ui/domains/Account` is intentional. Inside a UI domain, sub-folders that hold components are PascalCase (`Sign/Ethereum`); non-React module folders are kebab-case (`Swap/swap-modules`).

## Inject (`src/inject/`)

```
inject/
├── shared/       Shared injection utilities
├── ethereum/     EIP-1193 provider (window.ethereum / window.talismanEth)
├── substrate/    Polkadot.js-compatible provider (window.injectedWeb3)
└── solana/       Solana wallet-standard provider
```

The content script (`entrypoints/content.ts`) relays messages between the page script and the service worker over `chrome.runtime.Port`. Injected code runs in the page: keep it small and trust nothing it receives.

## Patterns

### Message-based IPC
Core and UI communicate through typed messages over `chrome.runtime.Port` (`ui/api` ↔ `core/handlers`). The only exception is state shared through chrome.storage and IndexedDB, which the UI reads directly. Do not add other channels.

### RxJS + @react-rxjs/core
Cross-domain UI state is an RxJS observable in `ui/state/`, exposed to React with `bind()`. Compose and filter streams; do not copy them into React state or context.

### provideContext
For React context (wizards, multi-step flows), use `provideContext` from `ui/util/provideContext.tsx` instead of a hand-written context and provider pair.

### No new barrel files
Do not add `index.ts` re-exports. Import from the source module (`@ui/domains/Portfolio/PortfolioContainer`, not `@ui/domains/Portfolio`). A few barrels exist (`@ui/api`, `@ui/components/Notifications`, `core/db`); use them as other code does, and do not add to the list.

### Feature flags
Feature flags come from remote config (`core/domains/app/store.remoteConfig.ts`), never from `common/constants.ts` or build-time env.
The flag list mirrors the schema of the remote-config service, which lives in another repo. Keep a flag that no code reads until that service removes it.

## Tests

- Unit tests: vitest, colocated or in `__tests__/`. Shared setup, mocks and fixtures are in `tests/`.
- Guard tests in `src/__tests__/` scan the source for banned patterns (e.g. `instanceof` on classes that bundles can duplicate). When one fails, read its header.
- Ambient type declarations go in `src/types/`.
