#!/bin/bash
# Build packages only if source files are newer than dist outputs
# This avoids unnecessary rebuilds when building multiple extension variants

set -e

PACKAGES_DIR="$(dirname "$0")/../packages"
NEEDS_BUILD=false

# Dynamically get list of packages, excluding the ones that don't need building
# (same as build:packages filter: !extension-core, !extension-shared, !talisman-ui)
EXCLUDED_PACKAGES="extension-core extension-shared talisman-ui"

for pkg_path in "$PACKAGES_DIR"/*/; do
  pkg=$(basename "$pkg_path")
  
  # Skip excluded packages
  if echo "$EXCLUDED_PACKAGES" | grep -qw "$pkg"; then
    continue
  fi
  
  # Skip if no src directory (not a buildable package)
  SRC_DIR="$pkg_path/src"
  if [ ! -d "$SRC_DIR" ]; then
    continue
  fi
  
  DIST_DIR="$pkg_path/dist"
  
  # If dist doesn't exist, we need to build
  if [ ! -d "$DIST_DIR" ]; then
    echo "📦 $pkg: dist/ missing, needs build"
    NEEDS_BUILD=true
    break
  fi
  
  # Find newest source file and newest dist file
  NEWEST_SRC=$(find "$SRC_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | xargs ls -t 2>/dev/null | head -1)
  NEWEST_DIST=$(find "$DIST_DIR" -type f 2>/dev/null | xargs ls -t 2>/dev/null | head -1)
  
  if [ -z "$NEWEST_DIST" ]; then
    echo "📦 $pkg: dist/ empty, needs build"
    NEEDS_BUILD=true
    break
  fi
  
  # Compare modification times
  if [ -n "$NEWEST_SRC" ] && [ "$NEWEST_SRC" -nt "$NEWEST_DIST" ]; then
    echo "📦 $pkg: source newer than dist, needs build"
    NEEDS_BUILD=true
    break
  fi
done

if [ "$NEEDS_BUILD" = true ]; then
  echo "🔨 Building packages..."
  pnpm build:packages
else
  echo "✅ All packages up to date, skipping build"
fi
