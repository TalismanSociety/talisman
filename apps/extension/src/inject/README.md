# `src/inject/` — Wallet Provider Injection

Content-script code injected into web pages to provide wallet connectivity.

**Subfolders:**
- `ethereum/` — EIP-1193 compatible Ethereum provider (`window.talismanEth`)
- `substrate/` — Polkadot.js-compatible provider (`window.injectedWeb3.talisman`)
- `solana/` — Solana wallet adapter compatible provider
- `shared/` — Shared injection utilities

**How it works:** The content script (`entrypoints/content.ts`) injects a page script that creates wallet provider objects on `window`. Communication flows: page script → `window.postMessage` → content script → `chrome.runtime.Port` → background service worker.

**Import rules:** May import from `@common`. May import types only from `@core`. Must never import from `@ui`.
