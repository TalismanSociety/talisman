#!/usr/bin/env bash
#
# Build production Firefox extension in Docker for reproducible builds.
#
# This script performs a TWO-PASS build to ensure reproducibility:
#   1. First pass: Build from repo → produces sources.zip
#   2. Second pass: Build from sources.zip → produces final deliverables
#
# This ensures the shipped extension is always built from the exact sources
# that are shipped, which is what Firefox reviewers will do.
#
# Usage:
#   ./scripts/build-firefox-docker.sh
#
# The built extension will be copied to apps/extension/dist/
#
set -euo pipefail

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

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Check for Docker
if ! command -v docker &> /dev/null; then
  log_error "Docker is not installed or not in PATH"
  exit 1
fi

IMAGE_NAME="talisman-firefox-builder"
TEMP_DIR="$PROJECT_ROOT/.firefox-build-temp"

# Get git SHA from host (where git is available)
COMMIT_SHA_SHORT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
log_info "Git SHA: $COMMIT_SHA_SHORT"

# Clean temp directory
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"/{pass1,pass2,sources}

log_step "PASS 1: Build from repo to generate sources.zip"

log_info "Building Docker image (no cache)..."
docker build --no-cache -t "${IMAGE_NAME}-pass1" -f Dockerfile.firefox --build-arg COMMIT_SHA_SHORT="$COMMIT_SHA_SHORT" .

log_info "Running first build..."
docker run --rm -v "$TEMP_DIR/pass1:/output" "${IMAGE_NAME}-pass1"

# Find the sources.zip from first pass
SOURCES_ZIP=$(ls "$TEMP_DIR/pass1"/*-sources.zip 2>/dev/null | head -1)
if [[ -z "$SOURCES_ZIP" ]]; then
  log_error "First pass did not produce sources.zip"
  exit 1
fi

log_success "First pass complete: $(basename "$SOURCES_ZIP")"

log_step "PASS 2: Rebuild from sources.zip for final deliverables"

# Extract version info from the sources zip filename before extracting
# Filename format: talisman-VERSION-production-GITSHA-sources.zip
SOURCES_BASENAME=$(basename "$SOURCES_ZIP" .zip)
# Extract the git SHA from the filename (e.g., "talisman-3.1.16-production-7d87c0e56-sources" -> "7d87c0e56")
PASS1_GITSHA=$(echo "$SOURCES_BASENAME" | sed -E 's/.*-production-([^-]+)-sources$/\1/')
log_info "Original Git SHA from pass 1: $PASS1_GITSHA"

# Extract sources
log_info "Extracting sources..."
unzip -q "$SOURCES_ZIP" -d "$TEMP_DIR/sources"

# Build from extracted sources  
cd "$TEMP_DIR/sources"
chmod +x scripts/*.sh 2>/dev/null || true

log_info "Building Docker image from sources (no cache)..."
docker build --no-cache -t "${IMAGE_NAME}-pass2" -f Dockerfile.firefox .

log_info "Running final build..."
docker run --rm -v "$TEMP_DIR/pass2:/output" "${IMAGE_NAME}-pass2"

cd "$PROJECT_ROOT"

# Rename outputs from pass 2 to use the original git SHA
# (The pass 2 build produces files with "unknown" SHA since there's no .git)
mkdir -p apps/extension/dist

for zipfile in "$TEMP_DIR/pass2"/*.zip; do
  # Replace "-unknown-" with the original git SHA
  newname=$(basename "$zipfile" | sed "s/-unknown-/-${PASS1_GITSHA}-/")
  cp "$zipfile" "apps/extension/dist/$newname"
done

# Get hashes
FIREFOX_ZIP=$(ls apps/extension/dist/*-${PASS1_GITSHA}-firefox.zip 2>/dev/null | head -1)
FINAL_SOURCES_ZIP=$(ls apps/extension/dist/*-${PASS1_GITSHA}-sources.zip 2>/dev/null | head -1)

if [[ -n "$FIREFOX_ZIP" ]]; then
  FIREFOX_HASH=$(shasum -a 256 "$FIREFOX_ZIP" | awk '{print $1}')
fi
if [[ -n "$FINAL_SOURCES_ZIP" ]]; then
  SOURCES_HASH=$(shasum -a 256 "$FINAL_SOURCES_ZIP" | awk '{print $1}')
fi

# Cleanup temp directory
rm -rf "$TEMP_DIR"

log_step "BUILD COMPLETE"
log_success "Production Firefox extension built successfully!"
echo ""
log_info "Output files:"
if [[ -n "$FIREFOX_ZIP" ]]; then
  echo "  $(basename "$FIREFOX_ZIP")"
  echo "    SHA256: $FIREFOX_HASH"
fi
if [[ -n "$FINAL_SOURCES_ZIP" ]]; then
  echo "  $(basename "$FINAL_SOURCES_ZIP")"
  echo "    SHA256: $SOURCES_HASH"
fi
echo ""
log_info "These builds are reproducible - rebuilding from sources.zip will produce identical output."
