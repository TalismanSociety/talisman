#!/usr/bin/env bash
#
# Build production Firefox extension in Docker for reproducible builds.
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
NC='\033[0m'

log_info() { echo -e "${YELLOW}→${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

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
CONTAINER_NAME="talisman-build-$$"

# Get git SHA from host (where git is available)
COMMIT_SHA_SHORT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
log_info "Git SHA: $COMMIT_SHA_SHORT"

log_info "Building Docker image for reproducible Firefox builds..."
docker build -t "$IMAGE_NAME" -f Dockerfile.firefox --build-arg COMMIT_SHA_SHORT="$COMMIT_SHA_SHORT" .

log_info "Running production Firefox build in Docker..."
mkdir -p apps/extension/dist
docker run --rm --name "$CONTAINER_NAME" \
  -v "$PROJECT_ROOT/apps/extension/dist:/talisman/apps/extension/dist" \
  "$IMAGE_NAME"

log_success "Production Firefox extension built successfully!"
log_info "Output: apps/extension/dist/"

# List the built files
ls -la apps/extension/dist/*.zip 2>/dev/null || true
