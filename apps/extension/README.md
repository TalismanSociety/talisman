# Talisman Wallet Browser Extension

The non-custodial Talisman Wallet browser extension for Chrome and Firefox.

## Build System

This extension uses [WXT](https://wxt.dev/) (built on Vite) for development and production builds. WXT provides:

- ⚡ **Fast rebuilds** (~10s) with hot module replacement
- 📦 **Optimized production builds** (~30MB vs ~300MB with webpack)
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
pnpm wxt:dev

# Firefox development
pnpm wxt:dev:firefox
```

### How Dev Mode Works

In development mode:

- Workspace packages (`@talismn/*`, `extension-core`, etc.) are aliased to their **source directories**
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

```bash
# Build for Chrome
pnpm wxt:build

# Build for Firefox
pnpm wxt:build:firefox

# Create distributable zip files
pnpm wxt:zip
pnpm wxt:zip:firefox
```

### Output Directories

| Command         | Output Directory       |
| --------------- | ---------------------- |
| `dev`           | `dist/chrome-mv3-dev`  |
| `dev:firefox`   | `dist/firefox-mv3-dev` |
| `build`         | `dist/chrome-mv3`      |
| `build:firefox` | `dist/firefox-mv3`     |

### How Production Builds Work

In production mode:

- Workspace packages resolve to their **pre-built `dist/` directories** (via tsup)
- Vite/Rollup performs full tree-shaking and minification
- Result is ~10x smaller than development builds

## Project Structure

```
apps/extension/
├── entrypoints/           # WXT entrypoints (background, content, popup, etc.)
│   ├── background.ts      # Service worker entry
│   ├── content.ts         # Content script entry
│   ├── page.ts            # Injected page script entry
│   ├── popup.html         # Popup UI
│   ├── dashboard.html     # Full-page dashboard
│   ├── onboarding.html    # Onboarding flow
│   └── support.html       # Support page
├── public/                # Static assets (icons, fonts, etc.)
├── src/                   # Application source code
│   ├── @talisman/         # Talisman-specific utilities
│   ├── common/            # Shared utilities
│   ├── inject/            # Page injection scripts
│   └── ui/                # React UI components
├── wxt.config.ts          # WXT/Vite configuration
└── dist/                  # Build outputs (gitignored)
```

## Configuration

### wxt.config.ts

The main configuration file controls:

- **Manifest generation** - Extension metadata, permissions, icons
- **Vite plugins** - React, SVG-to-component, markdown handling
- **Path aliases** - Conditional dev/prod resolution for workspace packages
- **Build options** - Target browsers, chunk splitting, optimizations

### Environment-Specific Behavior

| Feature            | Development     | Production      |
| ------------------ | --------------- | --------------- |
| Package resolution | Source (`src/`) | Built (`dist/`) |
| Icon suffix        | `-dev`          | `-prod`         |
| Minification       | Disabled        | Enabled         |
| Source maps        | Inline          | Separate        |

## Testing

```bash
# Run unit tests
pnpm test

# Run E2E tests (Playwright)
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

1. Ensure all packages are built: `pnpm build:packages` from monorepo root
2. Clear the WXT cache: `rm -rf dist .wxt`
3. Reinstall dependencies: `pnpm install`

## License

GPL-3.0-or-later - See [LICENSE](./LICENSE)
