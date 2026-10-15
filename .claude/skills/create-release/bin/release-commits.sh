#!/usr/bin/env bash
# Lists the commits on HEAD since the last release.
# Release tags point at PR-branch commits that squash-merge away, so the anchor is
# the last commit on HEAD that changed the extension version, not the tag.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

manifest=apps/extension/package.json
current=$(node -p "require('./$manifest').version")
latest_tag=$(git tag --list 'v[0-9]*' --sort=-v:refname | head -1)
anchor=$(git log -1 --format=%h -G'"version":' -- "$manifest")

echo "current version: $current"
echo "latest tag:      ${latest_tag:-none}"
echo "anchor commit:   $(git log -1 --format='%h %s' "$anchor")"
if [[ "v$current" != "$latest_tag" ]]; then
  echo "WARNING: $manifest says $current but the newest tag is ${latest_tag:-none}"
fi
echo
git log --no-merges --format='%h %s' "$anchor..HEAD" | grep -v ' chore: bump package versions' || true
