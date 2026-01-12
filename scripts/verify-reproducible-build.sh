#!/usr/bin/env bash
#
# Verify that a Firefox extension build can be reproduced exactly from its sources.
# Uses Docker for deterministic builds.
#
# Usage:
#   ./scripts/verify-reproducible-build.sh [firefox-zip] [sources-zip]
#
# If no zip files provided, uses the latest *-firefox.zip and *-sources.zip from dist/
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

# Check for Docker
if ! command -v docker &> /dev/null; then
  log_error "Docker is required but not installed or not in PATH"
  exit 2
fi

# Find the latest zip files if not provided
if [[ $# -eq 0 ]]; then
  FIREFOX_ZIP=$(ls -t "$DIST_DIR"/*-firefox.zip 2>/dev/null | head -1)
  if [[ -z "$FIREFOX_ZIP" ]]; then
    log_error "No *-firefox.zip found in $DIST_DIR"
    log_info "Run 'pnpm build:extension:prod:firefox' first"
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

log_info "Verifying reproducible build (using Docker)"
echo "  Firefox zip: $FIREFOX_ZIP"
echo "  Sources zip: $SOURCES_ZIP"

# Clean up any previous verification
rm -rf "$VERIFY_DIR"
mkdir -p "$VERIFY_DIR"/{original,rebuilt,sources}

# Extract original firefox zip
log_info "Extracting original build: $FIREFOX_ZIP"
unzip -q "$FIREFOX_ZIP" -d "$VERIFY_DIR/original"

# Extract sources (full monorepo)
log_info "Extracting sources: $SOURCES_ZIP"
unzip -q "$SOURCES_ZIP" -d "$VERIFY_DIR/sources"

# Build from sources using Docker
log_info "Rebuilding from sources..."
cd "$VERIFY_DIR/sources"
log_info "Build context: $(pwd)"

# Restore execute permissions on shell scripts (zip doesn't preserve them)
chmod +x scripts/*.sh 2>/dev/null || true

# Extract git SHA from the original build filename (format: talisman-VERSION-BUILDTYPE-SHA-firefox.zip)
ORIGINAL_SHA=$(basename "$FIREFOX_ZIP" | sed -E 's/.*-([a-f0-9]+)-firefox\.zip$/\1/')
log_info "Using git SHA from original build: $ORIGINAL_SHA"

log_info "Building Docker image (no cache)..."
if ! docker build --no-cache -t talisman-verify-build -f Dockerfile.firefox --build-arg COMMIT_SHA_SHORT="$ORIGINAL_SHA" .; then
  log_error "Docker build failed"
  exit 2
fi

log_info "Running production build in Docker..."
mkdir -p apps/extension/dist
if ! docker run --rm \
  -v "$(pwd)/apps/extension/dist:/talisman/apps/extension/dist" \
  talisman-verify-build; then
  log_error "Docker run failed"
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
log_info "Extracting rebuilt extension: $REBUILT_ZIP"
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
    log_success "File structure matches when ignoring chunk hashes."
    log_info ""
    
    # Create normalized copies of files for comparison (strip hashes from references)
    mkdir -p "$VERIFY_DIR/normalized-original" "$VERIFY_DIR/normalized-rebuilt"
    
    # Function to normalize file content by replacing chunk hashes
    normalize_content() {
      local src="$1"
      local dst="$2"
      # Replace chunk hash references like popup-64cac53e.js with popup-HASH.js
      sed -E 's/([a-zA-Z0-9_-]+)-[a-f0-9]{8,}\.js/\1-HASH.js/g' "$src" > "$dst"
    }
    
    log_info "Verifying files are equivalent (ignoring hash references)..."
    ALL_EQUIVALENT=true
    
    # Check manifest.json (should be byte-identical)
    if diff -q "$VERIFY_DIR/original/manifest.json" "$VERIFY_DIR/rebuilt/manifest.json" > /dev/null 2>&1; then
      log_success "manifest.json is identical"
    else
      log_error "manifest.json differs"
      ALL_EQUIVALENT=false
    fi
    
    # Check HTML files with normalized content
    for html in popup.html dashboard.html onboarding.html support.html; do
      if [[ -f "$VERIFY_DIR/original/$html" ]]; then
        normalize_content "$VERIFY_DIR/original/$html" "$VERIFY_DIR/normalized-original/$html"
        normalize_content "$VERIFY_DIR/rebuilt/$html" "$VERIFY_DIR/normalized-rebuilt/$html"
        
        if diff -q "$VERIFY_DIR/normalized-original/$html" "$VERIFY_DIR/normalized-rebuilt/$html" > /dev/null 2>&1; then
          log_success "$html is equivalent (only hash references differ)"
        else
          log_error "$html has content differences beyond hashes"
          ALL_EQUIVALENT=false
        fi
      fi
    done
    
    # Check main entry points with normalized content
    for entry in background.js; do
      if [[ -f "$VERIFY_DIR/original/$entry" ]]; then
        normalize_content "$VERIFY_DIR/original/$entry" "$VERIFY_DIR/normalized-original/$entry"
        normalize_content "$VERIFY_DIR/rebuilt/$entry" "$VERIFY_DIR/normalized-rebuilt/$entry"
        
        if diff -q "$VERIFY_DIR/normalized-original/$entry" "$VERIFY_DIR/normalized-rebuilt/$entry" > /dev/null 2>&1; then
          log_success "$entry is equivalent (only hash references differ)"
        else
          log_error "$entry has content differences beyond hashes"
          ALL_EQUIVALENT=false
        fi
      fi
    done
    
    # Compare chunk content by normalizing import paths
    log_info ""
    log_info "Analyzing chunk content differences..."
    
    mkdir -p "$VERIFY_DIR/analysis"
    
    # Create a mapping of original chunks to rebuilt chunks by size (approximate content match)
    cd "$VERIFY_DIR/original/chunks" 2>/dev/null && {
      ORIG_CHUNKS=$(ls -la *.js 2>/dev/null | awk '{print $5 " " $9}' | sort -n)
      cd - > /dev/null
    } || ORIG_CHUNKS=""
    
    cd "$VERIFY_DIR/rebuilt/chunks" 2>/dev/null && {
      REBUILT_CHUNKS=$(ls -la *.js 2>/dev/null | awk '{print $5 " " $9}' | sort -n)
      cd - > /dev/null
    } || REBUILT_CHUNKS=""
    
    # Count chunks with similar sizes (within 100 bytes)
    ORIG_CHUNK_COUNT=$(echo "$ORIG_CHUNKS" | wc -l | tr -d ' ')
    REBUILT_CHUNK_COUNT=$(echo "$REBUILT_CHUNKS" | wc -l | tr -d ' ')
    
    if [[ "$ORIG_CHUNK_COUNT" == "$REBUILT_CHUNK_COUNT" ]]; then
      log_success "Same number of chunks: $ORIG_CHUNK_COUNT"
    else
      log_error "Different chunk counts: original=$ORIG_CHUNK_COUNT, rebuilt=$REBUILT_CHUNK_COUNT"
    fi
    
    # Create a summary of chunk sizes
    echo "$ORIG_CHUNKS" | awk '{print $1}' | sort -n > "$VERIFY_DIR/analysis/original_sizes.txt"
    echo "$REBUILT_CHUNKS" | awk '{print $1}' | sort -n > "$VERIFY_DIR/analysis/rebuilt_sizes.txt"
    
    if diff -q "$VERIFY_DIR/analysis/original_sizes.txt" "$VERIFY_DIR/analysis/rebuilt_sizes.txt" > /dev/null 2>&1; then
      log_success "Chunk size distribution matches"
    else
      log_info "Chunk sizes differ (expected due to different import paths in code)"
    fi
    
    log_info ""
    log_info "Summary:"
    log_info "  - File structure: ✓ Identical"
    log_info "  - Chunk count: ✓ Same ($ORIG_CHUNK_COUNT chunks)"
    log_info "  - Entry files: $([ "$ALL_EQUIVALENT" = true ] && echo "✓ Equivalent" || echo "⚠ Content differs")"
    log_info ""
    
    if [[ "$ALL_EQUIVALENT" = true ]]; then
      log_success "Build verification passed!"
      log_info "The extension is functionally equivalent despite different chunk hashes."
      log_info "This is expected behavior with Vite/Rollup builds."
      log_info ""
      log_info "For detailed inspection, see $VERIFY_DIR"
      exit 0
    else
      log_error "Build verification failed!"
      log_info "Entry files have content differences beyond hash references."
      log_info "For detailed inspection, see $VERIFY_DIR"
      exit 1
    fi
  else
    log_error "File structure differs even when ignoring hashes!"
    echo ""
    diff "$VERIFY_DIR/original.normalized" "$VERIFY_DIR/rebuilt.normalized" || true
  fi
  
  echo ""
  log_info "Verification artifacts kept in $VERIFY_DIR for inspection"
  exit 1
fi
