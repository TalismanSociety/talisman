#!/usr/bin/env bash
# Prints the next RC suffix for a version, e.g. RC3.
# RC numbers count per version across every build sha, so any existing
# talisman-<version>-production-*-<browser>_RC<N>.zip takes up N.
set -euo pipefail
version=${1:?usage: next-rc.sh <version>}
dist="$(git rev-parse --show-toplevel)/apps/extension/dist"

highest=0
shopt -s nullglob
for zip in "$dist"/talisman-"$version"-production-*_RC*.zip; do
  n=${zip##*_RC}
  n=${n%.zip}
  [[ "$n" =~ ^[0-9]+$ ]] && ((n > highest)) && highest=$n
done
echo "RC$((highest + 1))"
