#!/usr/bin/env bash
# Renames the production zip of HEAD for one browser to its RC name and prints the new path.
set -euo pipefail
version=${1:?usage: rename-build.sh <version> <chrome|firefox> <RCn>}
browser=${2:?usage: rename-build.sh <version> <chrome|firefox> <RCn>}
rc=${3:?usage: rename-build.sh <version> <chrome|firefox> <RCn>}
root=$(git rev-parse --show-toplevel)
sha=$(git rev-parse --short HEAD)

source="$root/apps/extension/dist/talisman-$version-production-$sha-$browser.zip"
target="${source%.zip}_$rc.zip"

[[ -f "$source" ]] || { echo "missing build: $source" >&2; exit 1; }
[[ -e "$target" ]] && { echo "already exists: $target" >&2; exit 1; }
mv "$source" "$target"
echo "$target"
