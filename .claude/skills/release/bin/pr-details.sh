#!/usr/bin/env bash
# Prints the title and body of each PR number given, in one GitHub API call.
set -euo pipefail
(($#)) || { echo "usage: pr-details.sh <pr-number>..." >&2; exit 1; }

fields=""
for n in "$@"; do
  fields+=" pr$n: pullRequest(number: $n) { number title body }"
done

gh api graphql \
  -f query="query { repository(owner: \"TalismanSociety\", name: \"talisman\") {$fields } }" \
  --jq '.data.repository[] | "## #\(.number) \(.title)\n\n\(.body)\n"'
