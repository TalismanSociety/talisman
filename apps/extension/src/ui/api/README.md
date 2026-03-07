# `ui/api/` — Background Message Bridge

IPC layer between the React UI and the background service worker.

**Not an HTTP API** — this is Chrome extension port-based message passing via `PortMessageService`.

**Files:**
- `api.ts` — The `api` object with 50+ typed methods for every background operation (account CRUD, signing, balances, chains, etc.)
- `types.ts` — TypeScript interface defining all available message methods
- `analytics.ts` — Analytics-specific helpers

**Usage:** UI code calls `api.methodName(args)` which sends a typed message to the background, where `core/handlers/Extension.ts` routes it to the appropriate domain handler.

```typescript
// UI code
const accounts = await api.accountsSubscribe(callback)
await api.approveSign(requestId, { signature })
```
