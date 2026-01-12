# Source Code Review Instructions

This document provides instructions for Firefox Add-on reviewers to build the Talisman browser extension from source.

## Prerequisites

- **Node.js**: v24.8.0 (specified in `.npmrc` as `use-node-version`)
- **pnpm**: v10 or later (run `corepack enable` to activate)
- **Git**: For cloning the repository

## Build Instructions

1. **Extract the sources ZIP** to a directory of your choice.

2. **Install dependencies**:

   ```bash
   pnpm install --frozen-lockfile
   ```

3. **Build the Firefox extension**:

   ```bash
   pnpm build:extension:firefox
   ```

4. **Find the built extension**:
   The built extension will be at `apps/extension/.output/firefox-mv3/`

## Important Notes

### Non-Deterministic Chunk Hashes

Due to the nature of Vite/Rollup bundling, chunk file hashes may differ between builds even with identical source code. This is caused by:

- **Module resolution order**: File system traversal order can vary between systems
- **Parallel processing**: Async operations may complete in different orders

The **functional content** of the extension is identical - only the chunk file names (which contain content hashes) may differ. You can verify this by:

1. Comparing the number of files (should be identical)
2. Normalizing chunk names by removing hash suffixes
3. Inspecting the actual JavaScript code

### Environment Variables

The build uses a `.env` file for configuration. This file is included in the sources ZIP. The following environment variables affect the build:

- `BUILD_TYPE`: Set to `production`, `canary`, or `dev` (affects Sentry integration)
- `SENTRY_AUTH_TOKEN`: Only needed for uploading sourcemaps (not required for local builds)

### Project Structure

This is a monorepo containing:

- `apps/extension/` - The browser extension source code
- `packages/` - Shared libraries used by the extension
- `.papi/` - Polkadot API descriptors (auto-generated, included in sources)

### Verification Script

A verification script is included to compare builds:

```bash
./scripts/verify-reproducible-build.sh
```

This script will:

1. Extract the original Firefox ZIP
2. Rebuild from sources
3. Compare the outputs
4. Report any differences

## Support

If you have questions about the build process, please open an issue at:
https://github.com/TalismanSociety/talisman
