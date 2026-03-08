# `src/core/` — Background Service Worker

Business logic layer that runs in the extension's service worker. Has no access to DOM or React.

**Subfolders:**
- `domains/` — Business logic grouped by feature (accounts, balances, signing, etc.). Each domain has a `handler.ts` that processes messages from the UI.
- `handlers/` — Message routing. `Extension.ts` dispatches incoming `PortMessageService` messages to the appropriate domain handler by message prefix.
- `libs/` — Singletons and infrastructure: `Handler` base class, `Store`, `Analytics`, `RequestStore`, `WindowManager`.
- `db/` — Dexie (IndexedDB) database schema, migrations, and blob storage.
- `rpcs/` — Chain connector instantiation for EVM, Substrate, and Solana networks.
- `util/` — Backend-only helpers: ABI parsing, contract data fetching, crypto operations.
- `types/` — Message protocol type definitions shared across handlers.

**Import rules:** May import from `@common`. Must never import from `@ui` or `inject`.
