# `src/common/` — Shared Configuration

Small but critical layer containing configuration and utilities shared between `core`, `ui`, and `inject`.

**Contents:**
- `constants.ts` — Port names, environment checks, API and docs URLs
- `enableAnyloggerLogsInDevelopment.ts` — Shows `@talismn/*` package logs (anylogger) in development builds
- `i18nConfig.ts` — i18next internationalization setup
- `i18nSharedConfig.ts` — Settings shared by the i18next runtime and the string extractor
- `log.ts` — Console logging wrapper, silent in tests
- `PortMessageService.ts` — Chrome extension port-based message passing (used by UI to talk to core)
- `WindowMessageService.ts` — Window postMessage communication (used by inject to talk to content script)
- `zodConfig.ts` — Zod schema defaults

**Import rules:** May import types only from `@core` (e.g. `@core/types`). Must not import from `@ui` or `inject`. This is the lowest-level shared layer.
