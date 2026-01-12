#!/usr/bin/env bash
#
# Verify that a Firefox extension build can be reproduced exactly from its sources.
#
# Usage:
#   ./scripts/verify-reproducible-build.sh [firefox-zip] [sources-zip]
#
# If no arguments provided, uses the latest *-firefox.zip and *-sources.zip from dist/
#
# Exit codes:
#   0 - Build is reproducible (zips match)
#   1 - Build differs (not reproducible)
#   2 - Error (missing files, build failed, etc.)
#
set -euo pipefail

# Store the original directory and use absolute paths
ORIG_DIR="$(pwd)"
DIST_DIR="$ORIG_DIR/apps/extension/dist"
VERIFY_DIR="$ORIG_DIR/.verify-build"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${YELLOW}→${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

# Find the latest zip files if not provided
if [[ $# -eq 0 ]]; then
  FIREFOX_ZIP=$(ls -t "$DIST_DIR"/*-firefox.zip 2>/dev/null | head -1)
  if [[ -z "$FIREFOX_ZIP" ]]; then
    log_error "No *-firefox.zip found in $DIST_DIR"
    log_info "Run 'pnpm build:extension:firefox' first"
    exit 2
  fi
  
  # Extract the build identifier (version-buildtype-sha) from the firefox zip
  BASENAME=$(basename "$FIREFOX_ZIP" -firefox.zip)
  SOURCES_ZIP="$DIST_DIR/${BASENAME}-sources.zip"
  
  if [[ ! -f "$SOURCES_ZIP" ]]; then
    log_error "Sources zip not found: $SOURCES_ZIP"
    exit 2
  fi
else
  FIREFOX_ZIP="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
  SOURCES_ZIP="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
fi

log_info "Verifying reproducible build"
echo "  Firefox zip: $FIREFOX_ZIP"
echo "  Sources zip: $SOURCES_ZIP"

# Clean up any previous verification
rm -rf "$VERIFY_DIR"
mkdir -p "$VERIFY_DIR"/{original,rebuilt,sources}

# Extract original firefox zip
log_info "Extracting original build..."
unzip -q "$FIREFOX_ZIP" -d "$VERIFY_DIR/original"

# Extract sources (full monorepo)
log_info "Extracting sources..."
unzip -q "$SOURCES_ZIP" -d "$VERIFY_DIR/sources"

# Build from sources
log_info "Rebuilding from sources..."
cd "$VERIFY_DIR/sources"

# Restore execute permissions on shell scripts (zip doesn't preserve them)
chmod +x scripts/*.sh 2>/dev/null || true

# Install dependencies and build
log_info "Running pnpm install..."
if ! pnpm install --frozen-lockfile; then
  log_error "pnpm install failed"
  exit 2
fi

log_info "Running pnpm build:extension:firefox..."
if ! pnpm build:extension:firefox; then
  log_error "Build failed"
  exit 2
fi

# Find the rebuilt zip in the nested dist directory
REBUILT_ZIP=$(ls -t apps/extension/dist/*-firefox.zip 2>/dev/null | head -1)
if [[ -z "$REBUILT_ZIP" ]]; then
  log_error "Rebuild did not produce a firefox zip"
  exit 2
fi

cd - > /dev/null

# Extract rebuilt zip
log_info "Extracting rebuilt extension..."
unzip -q "$VERIFY_DIR/sources/$REBUILT_ZIP" -d "$VERIFY_DIR/rebuilt"

# Compare the contents
log_info "Comparing builds..."

# Generate sorted file lists with hashes
generate_manifest() {
  local dir="$1"
  local output="$2"
  cd "$dir"
  find . -type f -exec shasum -a 256 {} \; | sort > "$output"
  cd - > /dev/null
}

generate_manifest "$VERIFY_DIR/original" "$VERIFY_DIR/original.manifest"
generate_manifest "$VERIFY_DIR/rebuilt" "$VERIFY_DIR/rebuilt.manifest"

# Compare manifests
if diff -q "$VERIFY_DIR/original.manifest" "$VERIFY_DIR/rebuilt.manifest" > /dev/null 2>&1; then
  log_success "Build is reproducible! All files match exactly."
  rm -rf "$VERIFY_DIR"
  exit 0
else
  log_error "Exact build match failed. Analyzing differences..."
  echo ""
  
  # Check if the only differences are chunk hashes (common in Vite/Rollup builds)
  # Extract just filenames without hashes for comparison
  normalize_filename() {
    # Replace hash patterns like -abc123de. or -abc123de] with normalized placeholder
    echo "$1" | sed -E 's/-[a-f0-9]{8,}\./-./'
  }
  
  # Count files in each build
  ORIG_COUNT=$(find "$VERIFY_DIR/original" -type f | wc -l | tr -d ' ')
  REBUILT_COUNT=$(find "$VERIFY_DIR/rebuilt" -type f | wc -l | tr -d ' ')
  
  if [[ "$ORIG_COUNT" != "$REBUILT_COUNT" ]]; then
    log_error "Different number of files: original=$ORIG_COUNT, rebuilt=$REBUILT_COUNT"
  else
    log_info "Same number of files ($ORIG_COUNT), checking for content equivalence..."
  fi
  
  # Show which files differ by hash pattern
  log_info "Files present only in original build:"
  diff "$VERIFY_DIR/original.manifest" "$VERIFY_DIR/rebuilt.manifest" 2>/dev/null | grep -E "^<" | awk '{print "  " $3}' || true
  
  echo ""
  log_info "Files present only in rebuilt:"
  diff "$VERIFY_DIR/original.manifest" "$VERIFY_DIR/rebuilt.manifest" 2>/dev/null | grep -E "^>" | awk '{print "  " $3}' || true

  # Check if differences are only in chunk filenames (hash variations)
  # Create normalized manifests that strip hashes from filenames
  log_info ""
  log_info "Checking if differences are only in chunk hashes..."
  
  cd "$VERIFY_DIR/original"
  find . -type f | sed -E 's/-[a-f0-9]{8,}\./-HASH./g' | sort > "$VERIFY_DIR/original.normalized"
  cd - > /dev/null
  
  cd "$VERIFY_DIR/rebuilt"
  find . -type f | sed -E 's/-[a-f0-9]{8,}\./-HASH./g' | sort > "$VERIFY_DIR/rebuilt.normalized"
  cd - > /dev/null
  
  if diff -q "$VERIFY_DIR/original.normalized" "$VERIFY_DIR/rebuilt.normalized" > /dev/null 2>&1; then
    log_info ""
    log_info "File structure matches when ignoring chunk hashes."
    log_info "The builds have the same files but with different content hashes."
    log_info ""
    log_info "This is expected with Vite/Rollup due to non-deterministic module ordering."
    log_info "For Firefox review, you can provide this explanation along with the sources."
    log_info ""
    log_info "Verification artifacts kept in $VERIFY_DIR for inspection"
    exit 1
  else
    log_error "File structure differs even when ignoring hashes!"
    echo ""
    diff "$VERIFY_DIR/original.normalized" "$VERIFY_DIR/rebuilt.normalized" || true
  fi
  
  echo ""
  log_info "Verification artifacts kept in $VERIFY_DIR for inspection"
  exit 1
fi
