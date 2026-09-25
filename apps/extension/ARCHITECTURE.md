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

Data flows `ui/domains` → `ui/state` or `ui/hooks` → `ui/api` → `PortMessageService` → `core/handlers/Extension.ts` → the domain's handler.

1. Add the request and response types to `core/domains/<domain>/types.ts`, and the message key to that domain's `<Domain>Messages` interface, which `core/types/index.ts` merges. The key is `"pri(<route>.<action>)"`, and its value is the tuple `[Request, Response]`, or `[Request, Response, SubscriptionData]` for a subscription.
2. Handle it in the domain's handler (`ExtensionHandler`). `<route>` is the handler's key in `#routes` in `core/handlers/Extension.ts`. It is not always the folder name: `ethereum` is `eth`, `sitesAuthorised` is `sites`. A handler for a new domain must go in `#routes`, else the background throws "Unable to handle message". Dapp-facing messages (`"pub(...)"`) go in a `TabsHandler` instead: `handler.tabs.ts` in `ethereum` and `solana`, registered in `#routes` in `core/handlers/Tabs.ts`, which also handles the Polkadot messages.
3. For a subscription, return `genericSubscription` or `genericAsyncSubscription` (`core/handlers/subscriptions.ts`) from the handler. Handlers get the stores from `this.stores` (`core/handlers/stores.ts`).
4. Expose it on the `api` object in `ui/api/api.ts` (`messageService.sendMessage`, or `messageService.subscribe` for a subscription) and type it in `ui/api/types.ts`.
5. If the UI needs it as reactive state shared by several domains, wrap it in `ui/state/` with `@react-rxjs/core`'s `bind()`. Otherwise call `api` from a hook in the domain (see [Async data](#async-data-react-query)).

## Core (`src/core/`)

```
core/
├── config/      Sentry setup
├── db/          Dexie (IndexedDB) schema and upgrades
├── domains/     Business logic, one folder per domain (camelCase)
├── handlers/    Message routing: Extension.ts (pri), Tabs.ts (pub)
├── libs/        Base classes and singletons: Handler, Store, RequestStore, migrations
├── notifications/ OS notifications
├── rpcs/        Chain connector instances (Polkadot SDK, EVM, Solana)
├── types/       Message protocol types
└── util/        Helpers with no domain affinity
```

`keyring/`, `mnemonics/` and `signing/` are security-critical. Change them with care and with tests.

### Core domain layout

A domain has only the files it needs:

- `handler.ts` — extends `ExtensionHandler`. A domain with dapp-facing messages uses `handler.extension.ts` and `handler.tabs.ts` (`TabsHandler`). A large handler can be a `handler/` folder. Never imported by `ui/`.
- `types.ts` — request and response types.
- `store.ts` / `store.<name>.ts` — persistent state: a `StorageProvider` or `SubscribableStorageProvider` from `core/libs/Store.ts` (chrome.storage), or a Dexie table.
- `helpers.ts` — pure functions.
- `exports.ts` — what `ui/` may import when the domain has more than helpers and types to share. It must not import `handler*.ts`.
- `migrations/` — data migrations for the domain's stores. Register a new migration at the end of the list in `core/libs/migrations/migrations.ts`. The runner records each migration by its index, so never insert, remove or reorder an entry. `legacy/` — old stores that only migrations read.
- Tests colocated as `*.test.ts` or `*.spec.ts`, or in `__tests__/`.

To change the Dexie schema, add a new `this.version(N)` in `core/db/db.ts`. Never change an existing version. Put data upgrades in `core/db/upgrades/`.

Do not add an `index.ts`. Import the file you need. Some domains have an `index.ts` already: see [No new barrel files](#no-new-barrel-files).

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

### Routes

The UI uses react-router 7 with a `HashRouter` (`ui/index.tsx`). Popup routes are in `ui/apps/popup/index.tsx`, with pages in `ui/apps/popup/pages/`. Dashboard routes are in `ui/apps/dashboard/index.tsx`, with pages in `ui/apps/dashboard/routes/`.

### Plug-in points

- Swap protocol: add the id to `SupportedSwapProtocol` (`ui/domains/Swap/swap-modules/swap-protocols.ts`), write `<id>-swap-module.ts` in that folder, and add it to `swapModules` in `ui/domains/Swap/swaps.api.ts`. To put it behind a feature flag, filter it in `useSwapModules`. To track the swap status, add a `swap-<id>` transaction type and a case in `fetchSwapStatus` (`core/domains/transactions/watchSwapStatus.ts`).
- Balance module: read `packages/balances/BalancesModules.md`, copy the nearest module in `packages/balances/src/modules/`, and add the new module to `BALANCE_MODULES` in `packages/balances/src/modules/index.ts`. Add a changeset.

### UI gotchas

- Global CSS gives every `svg` a size of 1em (`ui/styles/styles.css`). Give a chart or other fixed-size SVG an explicit size class.
- Do not put a `Modal` in a row of a virtualized list. The row unmounts when it scrolls out of view, and the modal closes with it.
- `Modal` and `Drawer` render in `document.body`. In a modal that has its own container, for example `SwapModal` (`id="swap-modal"`), give the child `Drawer` or `Modal` that id as `containerId`, else it does not show in the modal.
- List pickers: a `SearchInputControlled`, then a `ScrollContainer` of full-width row buttons with no rounded corners. Copy `ui/domains/Staking/Bittensor/BittensorBondModal/Forms/BittensorStakingPositionSelect.tsx`.
- Show a Bittensor hotkey with `BittensorHotkeyAvatar` (`ui/domains/Staking/Bittensor/components/`), not `AccountIcon`. It shows the validator logo when one exists.

## Naming

| Layer | Folder casing | File casing |
|-------|--------------|-------------|
| `core/domains/` | camelCase (`accounts`, `sendFunds`) | camelCase or kebab-case |
| `ui/domains/`, `ui/components/` | PascalCase (`Account`, `SendFunds`) | PascalCase for components, camelCase for hooks and utils |
| `ui/hooks/` | — | `use*.ts` |
| `ui/state/` | — | camelCase `.ts` |

The case difference between `core/domains/accounts` and `ui/domains/Account` is intentional. Inside a UI domain, give new sub-folders that hold components a PascalCase name (`Sign/Ethereum`), and new non-React module folders a kebab-case name (`Swap/swap-modules`). Many existing folders do not follow this rule (`Earn/yieldxyz`, `Sign/risk-analysis`). Do not rename them only for the rule.

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

### Async data (react-query)
Fetch async data (`api` requests to the backend, HTTP APIs, chain queries) with `useQuery` and `useMutation` from `@tanstack/react-query`. Do not write a `useEffect` and `useState` fetcher, and do not put this data in `ui/state/`.
- The `queryKey` starts with a unique name, then holds every value that `queryFn` reads (for example `["useActiveStakingEra", sapi?.id]`).
- To keep a result when the popup closes, add a `persister` from `createQueryStoragePersister` (`ui/hooks/queryStoragePersister.ts`).
- Wrap query options that you build outside `useQuery(...)` in `queryOptions()`, else `data` has the type `{}`.

Use `ui/state/` and `bind()` for backend subscriptions and for stores that several domains read.

### provideContext
For React context (wizards, multi-step flows), use `provideContext` from `ui/util/provideContext.tsx` instead of a hand-written context and provider pair.

### No new barrel files
Do not add `index.ts` re-exports. Import from the source module (`@ui/domains/Portfolio/PortfolioContainer`, not `@ui/domains/Portfolio`). About 35 barrels exist, for example `@ui/api`, `@ui/components/Notifications`, `core/db`, `core/notifications` and most `core/domains/*/index.ts` (`Extension.ts` imports the handlers through them). Use them as other code does. Do not add a new one.

### Feature flags
Feature flags come from remote config (`core/domains/app/store.remoteConfig.ts`), never from `common/constants.ts` or build-time env.
The flag list mirrors the schema of the remote-config service, which lives in another repo. Keep a flag that no code reads until that service removes it.
Read a flag in the UI with `useFeatureFlag("FLAG_NAME")` from `@ui/state/remoteConfig`. To add a flag, add it to the remote-config service first. Then run `pnpm --filter extension chore:generate-clients:wrc` (updates `RemoteConfigApi.ts`, the source of the `FeatureFlag` type) and `pnpm chore:generate-init-data` (updates `core/domains/app/remoteConfig.default.json`).

## Tests

- Unit tests: vitest, colocated or in `__tests__/`. Shared setup, mocks and fixtures are in `tests/`.
- The tests run in jsdom with global mocks (`setupFiles` in `vitest.config.mts`). Unit tests need no network and no secrets.
  - `@ui/api` is `mockedApi` (`tests/mocks/api.ts`). A method that it does not define returns `undefined`. In your test, mock the methods you use: `vi.mock("@ui/api", () => ({ api: { ... } }))`. Code that imports `@ui/api/api` needs `vi.mock("@ui/api/api", ...)`.
  - `react-i18next` returns the English string. `chrome.*` is sinon-chrome with in-memory storage. IndexedDB is `fake-indexeddb`. Chaindata network fetches and remote config are mocked.
  - Wrap a component that uses `bind()` hooks in `TestWrapper` (`tests/TestWrapper.tsx`).
- Guard tests in `src/__tests__/` scan the source for banned patterns (e.g. `instanceof` on classes that bundles can duplicate). When one fails, read its header.
- Ambient type declarations go in `src/types/`.
