# `core/libs/` — Infrastructure Singletons

Foundational classes and utilities used across all core domains.

**Key files:**
- `Handler.ts` — `ExtensionHandler` base class that all domain handlers extend. Provides `handle()` method for message dispatch.
- `Store.ts` — Generic key-value store abstraction over `chrome.storage.local`.
- `Analytics.ts` — Analytics event tracking.
- `WindowManager.ts` — Opens/manages extension windows (popups, dashboard, onboarding).
- `IconManager.ts` — Dynamic extension icon management.
- `GeneralReport.ts` — Builds the daily wallet usage report sent to analytics (PostHog).
- `isWalletReady.ts` — `isWalletReady$` / `walletReady$`: fires once the background has finished startup.
- `uiOpenState.ts` — Tracks whether any extension UI (popup, dashboard, onboarding) is open.
- `QrGenerator/` — Builds Polkadot Vault QR payloads (network specs, metadata updates).
- `migrations/` — Data migration framework for version upgrades.
- `requests/` — `RequestStore` (`store.ts`): pending approval requests (signing, site authorization) and their lifecycle.
