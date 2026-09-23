# Talisman Wallet Browser Extension

The non-custodial Talisman Wallet browser extension for Chrome and Firefox.

## Build System

This extension uses [WXT](https://wxt.dev/) (built on Vite) for development and production builds. WXT provides:

- ⚡ **Fast rebuilds** (~10s) with hot module replacement
- 📦 **Optimized production builds**
- 🔄 **Automatic browser reload** when code changes
- 🎯 **Manifest V3** support for Chrome and Firefox

## Development

### Quick Start

From the monorepo root:

```bash
# Install dependencies
pnpm install

# Start dev server (Chrome)
pnpm dev:extension
```

Then load the extension in Chrome:

1. Navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `apps/extension/dist/chrome-mv3-dev`

### Development Commands

```bash
# Chrome development (with HMR)
pnpm dev:extension

# Firefox development (output in dist/firefox-mv3-dev)
pnpm dev:extension:firefox
```

Inside `apps/extension`, the same scripts are `pnpm dev` and `pnpm dev:firefox`.

### How Dev Mode Works

In development mode:

- Workspace packages (`@talismn/*`) are aliased to their **source directories**
- Changes to package source files trigger immediate rebuilds without needing to rebuild packages
- The Vite dev server provides hot module replacement for React components

### Persistent Browser Profile

Your extension data (accounts, settings) persists between dev sessions:

| Browser | How It Works                                                                  |
| ------- | ----------------------------------------------------------------------------- |
| Chrome  | Profile stored in `~/.talisman-dev/chrome-data` (outside repo for security)   |
| Firefox | Uses Firefox's native profile storage, identified by extension ID in manifest |

The Chrome profile is stored **outside the repository** for security, since it may contain real wallet data. This location:

- Is not synced to cloud drives (iCloud, Dropbox) if your repo is in a synced folder
- Is not accessible to npm packages that might scan the repo
- Survives `pnpm clean` and repo deletion
- Is shared across all Talisman repo clones on your machine

## Production Builds

### Build Commands

All build commands produce both an unpacked extension directory and a distributable zip file. Run these commands inside `apps/extension`. From the repo root, use the `build:extension*` scripts (e.g. `pnpm build:extension:prod`).

```bash
# Build for Chrome (local testing)
pnpm build

# Build for Firefox (local testing)
pnpm build:firefox

# Production builds (Chrome Web Store / Firefox Add-ons)
# Enables Sentry sourcemap upload
pnpm build:prod
pnpm build:prod:firefox  # Local build; the release build runs via Docker (root: pnpm build:extension:prod:firefox)

# Canary builds (internal testing)
pnpm build:canary
pnpm build:canary:firefox
```

#### Firefox Production Builds

Firefox production builds use a **two-pass Docker build** to ensure reproducibility. See the [root README](../../README.md#firefox-production-builds) and [FIREFOX_SOURCE_CODE_REVIEW.md](../../FIREFOX_SOURCE_CODE_REVIEW.md) for details.

#### Environment Variables for Production Builds

| Variable            | Required | Description                                     |
| ------------------- | -------- | ----------------------------------------------- |
| `SENTRY_AUTH_TOKEN` | Chrome   | Sentry token for sourcemap upload (build only warns without it) |
| `SENTRY_DSN`        | Chrome   | Sentry DSN used at runtime                      |
| `POSTHOG_AUTH_TOKEN`| Chrome   | PostHog analytics token                         |
| `SIMPLE_LOCALIZE_API_KEY` | Release | Used by `pnpm chore:download-translations` |
| `BUILD_TYPE`        | Auto     | Set by build scripts (`production` or `canary`) |

See `.env.sample` for the full list, including dev-only variables.

#### Sourcemap Handling

- **Production/Canary Chrome builds**: Generate hidden sourcemaps (no inline reference in JS)
- **Sentry upload**: Sourcemaps are uploaded to Sentry for error tracking (Chrome only)
- **Firefox production/canary builds**: No sourcemaps
- **Cleanup**: Sourcemaps are automatically deleted before zipping to keep them out of the final distribution

### Output Directories

| Command             | Unpacked Directory     | Zip File                                     |
| ------------------- | ---------------------- | -------------------------------------------- |
| `dev`               | `dist/chrome-mv3-dev`  | -                                            |
| `dev:firefox`       | `dist/firefox-mv3-dev` | -                                            |
| `build` / `build:*` | `dist/chrome-mv3`      | `dist/talisman-{version}-{buildType}-{gitSha}-chrome.zip`  |
| `build:*:firefox`   | `dist/firefox-mv3`     | `dist/talisman-{version}-{buildType}-{gitSha}-firefox.zip` |

### Build Variants

| Build Type  | Name Suffix | Version Name Example   | Sentry Upload |
| ----------- | ----------- | ---------------------- | ------------- |
| Production  | (none)      | `3.1.16`                  | ✅ (Chrome)   |
| Canary      | ` - Canary` | `3.1.16 canary - abc1234` | ✅ (Chrome)   |
| Dev Server  | ` - Dev`    | `3.1.16 dev - abc1234`    | ❌            |
| Local Build | (none)      | `3.1.16 dev - abc1234`    | ❌            |

### How Production Builds Work

In production mode:

- Workspace packages are bundled from their **source directories** (`packages/*/src`), as in dev mode. No package build is needed.
- Vite/Rolldown performs full tree-shaking and minification

## Project Structure

```
apps/extension/
├── entrypoints/           # WXT entrypoints (background, content, popup, etc.)
│   ├── background.ts      # Service worker entry
│   ├── content.ts         # Content script entry
│   ├── page.ts            # Injected page script entry
│   ├── popup/             # Popup UI (index.html + main.tsx)
│   ├── dashboard/         # Full-page dashboard
│   ├── onboarding/        # Onboarding flow
│   └── support/           # Support page
├── public/                # Static assets (icons, fonts, etc.)
├── src/                   # Application source code
│   ├── common/            # Shared utilities
│   ├── core/              # Service worker / backend logic
│   ├── inject/            # Page injection scripts
│   └── ui/                # React UI (components, hooks, state, domains)
├── wxt.config.ts          # WXT/Vite configuration
└── dist/                  # Build outputs (gitignored)
```

## Configuration

### wxt.config.ts

The main configuration file controls:

- **Manifest generation** - Extension metadata, permissions, icons
- **Vite plugins** - React, SVG-to-component, markdown handling
- **Path aliases** - Workspace packages resolve to their source
- **Build options** - Target browsers, chunk splitting, optimizations

### Environment-Specific Behavior

| Feature            | Development     | Production/Canary                         |
| ------------------ | --------------- | ----------------------------------------- |
| Package resolution | Source (`src/`) | Source (`src/`)                           |
| Icon suffix        | `-dev`          | `-prod` / `-canary`                       |
| Minification       | Disabled        | Enabled                                   |
| Source maps        | Separate `.map` files | Chrome: hidden (uploaded to Sentry, then deleted). Firefox: none |
| Sentry upload      | No              | Chrome only                               |

## Testing

```bash
# Run unit tests
pnpm test

# Run E2E tests (Playwright, from the repo root)
pnpm test:e2e
```

## Troubleshooting

### Extension not loading in browser

1. Ensure you've run `pnpm install` from the monorepo root
2. Check that the dev server is running (`pnpm dev`)
3. Verify the correct output directory is loaded (`dist/chrome-mv3-dev`)

### Changes not reflecting

1. Check the terminal for build errors
2. Try reloading the extension in `chrome://extensions`
3. For background script changes, click the "service worker" link to inspect/reload

### Build failures

1. Clean temp folders: `pnpm clean`
2. Reinstall dependencies: `pnpm install`

## License

The Talisman License (source-available, non-commercial) - See [LICENSE](./LICENSE)
