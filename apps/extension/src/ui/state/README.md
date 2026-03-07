# `ui/state/` — Reactive State Layer

RxJS observables that bridge background data into React components.

**Pattern:** Each file subscribes to background data via `api` (from `ui/api/`), wraps it in an RxJS `Observable`, and uses `@react-rxjs/core`'s `bind()` to produce React hooks.

```typescript
// Example: accounts.ts
const accounts$ = new Observable<Account[]>((subscriber) => {
  const unsubscribe = api.accountsSubscribe((accounts) => subscriber.next(accounts))
  return () => unsubscribe()
}).pipe(shareReplay(1))

export const [useAccounts] = bind(accounts$)
```

**What belongs here:** Cross-domain observables used by 2+ UI domains (accounts, balances, chaindata, settings, etc.).

**What doesn't belong here:** State used by a single domain should live in that domain's own `state/` folder (e.g., `ui/domains/Swap/state/`).

**Relationship to `ui/hooks/`:** State files produce low-level data hooks (`useAccounts`, `useBalances`). Hooks in `ui/hooks/` are higher-level and may combine multiple state hooks with UI logic.
