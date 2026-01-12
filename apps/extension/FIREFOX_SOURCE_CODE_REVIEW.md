# Source Code Review Instructions

This document provides instructions for Firefox Add-on reviewers to build the Talisman browser extension from source.

## Prerequisites

- **Docker**: Any recent version

## Build Instructions

1. **Extract the sources ZIP** to a directory of your choice.

2. **Build using Docker**:

   ```bash
   docker build -t talisman-builder -f Dockerfile.firefox .
   docker run --rm -v $(pwd)/apps/extension/dist:/talisman/apps/extension/dist talisman-builder
   ```

   Or use the convenience script:

   ```bash
   ./scripts/build-firefox-docker.sh
   ```

3. **Find the built extension**:
   The built extension ZIP will be at `apps/extension/dist/`

## Build Reproducibility

Docker builds produce **100% deterministic output**. Running the same Docker build twice will produce identical file contents with matching SHA-256 hashes.

> **Note**: ZIP file checksums may differ due to timestamps in the archive metadata, but the extracted contents will be byte-for-byte identical.

### Verification

To verify the build matches the submitted extension:

1. Extract both the original Firefox ZIP and the rebuilt ZIP
2. Compare the file contents using SHA-256 hashes

```bash
# Extract and compare
unzip -q original-firefox.zip -d original/
unzip -q rebuilt-firefox.zip -d rebuilt/

# Generate and compare file hashes
find original -type f -exec shasum -a 256 {} \; | sort > original.sha
find rebuilt -type f -exec shasum -a 256 {} \; | sort > rebuilt.sha

# Normalize paths and compare
sed 's|original/|build/|g' original.sha > original_normalized.sha
sed 's|rebuilt/|build/|g' rebuilt.sha > rebuilt_normalized.sha
diff original_normalized.sha rebuilt_normalized.sha
```

A verification script is also included:

```bash
./scripts/verify-reproducible-build.sh
```
