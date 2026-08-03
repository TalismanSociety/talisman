# Source Code Review Instructions

This document provides instructions for Firefox Add-on reviewers to build the Talisman browser extension from source.

## Prerequisites

- **Docker**: Any recent version (20.10+)
- **Network access**: Docker must be able to reach the npm registry to download dependencies during the build

## Build Instructions

1. **Extract the submitted sources ZIP** to a directory of your choice:

   ```bash
   unzip talisman-*-sources.zip -d talisman-sources
   cd talisman-sources
   ```

2. **Build using Docker**:

   ```bash
   mkdir -p output
   docker build --no-cache -t talisman-builder -f Dockerfile.firefox .
   docker run --rm -v "$(pwd)/output:/output" talisman-builder
   ```

3. **Find the built extension**:
   The built extension ZIP will be in the `output/` directory.

## Build Reproducibility

This build produces **byte-identical, reproducible output**. The ZIP file checksums will match exactly when rebuilt from the same sources.

### Key reproducibility features:

- **Docker isolation**: Deterministic Node.js environment with fixed locale/timezone
- **Normalized timestamps**: All ZIP entries use a fixed timestamp (2000-01-01T00:00:00Z)
- **Deterministic bundling**: Rolldown (Vite 8) output is sorted and consistent across builds
- **Two-pass build**: Production builds are always built from `sources.zip` to ensure what's shipped matches what reviewers build

### Verification

To verify the build matches the submitted extension, compare SHA-256 checksums:

```bash
# The rebuilt ZIP should have the exact same hash
shasum -a 256 output/*-firefox.zip
shasum -a 256 submitted-firefox.zip
```

The hashes should be **identical**. No extraction or file-by-file comparison is needed.
