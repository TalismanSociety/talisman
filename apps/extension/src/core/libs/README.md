# `core/libs/` — Infrastructure Singletons

Foundational classes and utilities used across all core domains.

**Key files:**
- `Handler.ts` — `ExtensionHandler` base class that all domain handlers extend. Provides `handle()` method for message dispatch.
- `Store.ts` — Generic key-value store abstraction over `chrome.storage.local`.
- `Analytics.ts` — Analytics event tracking.
- `RequestStore.ts` — Manages pending approval requests (signing, site authorization).
- `WindowManager.ts` — Opens/manages extension windows (popups, dashboard, onboarding).
- `IconManager.ts` — Dynamic extension icon management.
- `migrations/` — Data migration framework for version upgrades.
- `requests/` — Request lifecycle management.
