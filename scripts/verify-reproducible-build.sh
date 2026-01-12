#!/usr/bin/env bash
#
# Verify that a Firefox extension build is reproducible.
#
# This script verifies that rebuilding from sources.zip produces
# byte-identical output to the shipped extension.
#
# Usage:
#   ./scripts/verify-reproducible-build.sh [firefox.zip sources.zip]
#
# If no arguments provided, uses the latest zips from apps/extension/dist/
#
# Exit codes:
#   0 - Build is reproducible
#   1 - Build differs (not reproducible)
#   2 - Error (build failed, etc.)
#
set -euo pipefail

ORIG_DIR="$(pwd)"
DIST_DIR="$ORIG_DIR/apps/extension/dist"
VERIFY_DIR="$ORIG_DIR/.verify-build"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${YELLOW}→${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_step() { echo -e "${BLUE}━━━ $1 ━━━${NC}"; }

# Check for Docker
if ! command -v docker &> /dev/null; then
  log_error "Docker is required but not installed or not in PATH"
  exit 2
fi

# Find zip files
if [[ $# -ge 2 ]]; then
  FIREFOX_ZIP="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
  SOURCES_ZIP="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
else
  FIREFOX_ZIP=$(ls -t "$DIST_DIR"/*-firefox.zip 2>/dev/null | head -1)
  if [[ -z "$FIREFOX_ZIP" ]]; then
    log_error "No *-firefox.zip found in $DIST_DIR"
    log_info "Run './scripts/build-firefox-docker.sh' first"
    exit 2
  fi
  
  BASENAME=$(basename "$FIREFOX_ZIP" -firefox.zip)
  SOURCES_ZIP="$DIST_DIR/${BASENAME}-sources.zip"
  
  if [[ ! -f "$SOURCES_ZIP" ]]; then
    log_error "Sources zip not found: $SOURCES_ZIP"
    exit 2
  fi
fi

log_step "VERIFYING REPRODUCIBLE BUILD"
echo ""
log_info "Firefox zip: $FIREFOX_ZIP"
log_info "Sources zip: $SOURCES_ZIP"
echo ""

ORIGINAL_HASH=$(shasum -a 256 "$FIREFOX_ZIP" | awk '{print $1}')
log_info "Original SHA256: $ORIGINAL_HASH"

# Clean up
rm -rf "$VERIFY_DIR"
mkdir -p "$VERIFY_DIR"/{sources,rebuild}

# Extract sources
log_info "Extracting sources..."
unzip -q "$SOURCES_ZIP" -d "$VERIFY_DIR/sources"

# Build from sources
cd "$VERIFY_DIR/sources"
chmod +x scripts/*.sh 2>/dev/null || true

log_info "Building Docker image from sources (no cache)..."
if ! docker build --no-cache -t talisman-verify-rebuild -f Dockerfile.firefox . >/dev/null 2>&1; then
  log_error "Docker build failed"
  exit 2
fi

log_info "Running rebuild from sources..."
if ! docker run --rm -v "$VERIFY_DIR/rebuild:/output" talisman-verify-rebuild; then
  log_error "Docker run failed"
  exit 2
fi

cd "$ORIG_DIR"

# Find rebuilt zip
REBUILT_ZIP=$(ls "$VERIFY_DIR/rebuild"/*-firefox.zip 2>/dev/null | head -1)
if [[ -z "$REBUILT_ZIP" ]]; then
  log_error "Rebuild did not produce a firefox zip"
  exit 2
fi

REBUILT_HASH=$(shasum -a 256 "$REBUILT_ZIP" | awk '{print $1}')
log_info "Rebuilt SHA256:  $REBUILT_HASH"
echo ""

# Compare
if [[ "$ORIGINAL_HASH" == "$REBUILT_HASH" ]]; then
  log_step "RESULT"
  echo ""
  log_success "Build is REPRODUCIBLE!"
  log_info "Original and rebuilt zips are byte-identical."
  log_info "SHA256: $ORIGINAL_HASH"
  echo ""
  rm -rf "$VERIFY_DIR"
  exit 0
else
  log_step "RESULT"
  echo ""
  log_error "Build is NOT reproducible!"
  log_error "Original: $ORIGINAL_HASH"
  log_error "Rebuilt:  $REBUILT_HASH"
  echo ""
  log_info "Artifacts kept in $VERIFY_DIR for inspection."
  exit 1
fi
