# `core/handlers/` — Message Routing

Routes incoming messages from the UI (via `PortMessageService`) to the appropriate domain handler.

**Key files:**
- `Extension.ts` — Main router. Maps message prefixes to domain handlers (e.g., `"accounts"` → `AccountsHandler`, `"signing"` → `SigningHandler`). Handles extension-originating messages (popup, dashboard).
- `Tabs.ts` — Routes messages from external web pages (dapp connections, signing requests).
- `index.ts` — Creates handler instances and exports the top-level `talismanHandler` function.
- `stores.ts` — Shared store references passed to handlers.
- `subscriptions.ts` — Manages active subscriptions and cleanup.

**Message format:** String keys like `"pri(accounts.subscribe)"` (private/extension) or `"pub(eth.request)"` (public/dapp). The prefix before the dot determines routing.
