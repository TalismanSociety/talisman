# `src/common/` — Shared Configuration

Small but critical layer containing configuration and utilities shared between `core`, `ui`, and `inject`.

**Contents:**
- `constants.ts` — Port names, feature flags, environment checks
- `cryptoConfig.ts` — Crypto library configuration
- `i18nConfig.ts` — i18next internationalization setup
- `log.ts` — Anylogger-based structured logging
- `PortMessageService.ts` — Chrome extension port-based message passing (used by UI to talk to core)
- `WindowMessageService.ts` — Window postMessage communication (used by inject to talk to content script)
- `zodConfig.ts` — Zod schema defaults

**Import rules:** Must not import from `@core`, `@ui`, or `inject`. This is the lowest-level shared layer.
