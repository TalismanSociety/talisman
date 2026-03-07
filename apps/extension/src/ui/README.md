# `src/ui/` — React Frontend

The presentation layer. Contains all React components, hooks, state management, and app shells.

**Subfolders:**
- `apps/` — App shells for each extension surface (popup, dashboard, onboard, support). Each defines routing and layout.
- `domains/` — Feature-specific React components grouped by business domain (PascalCase). The bulk of the UI code lives here.
- `state/` — RxJS observables that subscribe to background data via `api`, exposed as React hooks via `@react-rxjs/core`'s `bind()`. Cross-domain state only.
- `hooks/` — Cross-cutting React hooks used in 2+ domains. Domain-specific hooks belong in their domain's `hooks/` folder instead.
- `components/` — Shared UI primitives (Button, Modal, Tabs, etc.) used across 3+ domains.
- `api/` — IPC bridge to the background service worker via `PortMessageService`. The `api` object exposes typed methods for every background operation.
- `util/` — Frontend-only helpers: formatting, image handling, address display.
- `theme/` — Image and logo assets.
- `styles/` — Global CSS.

**Import rules:** May import from `@common` and `@core` (types and domain exports). Must never import from `inject`.
