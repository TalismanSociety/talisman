#!/usr/bin/env bash
# tabs.sh baseline <run-dir>: records the browser and the page targets open before the run.
# tabs.sh cleanup <run-dir>:  closes every page target of that browser that is not in the baseline.
set -euo pipefail
action=${1:?usage: tabs.sh baseline|cleanup <run-dir>}
run_dir=${2:?usage: tabs.sh baseline|cleanup <run-dir>}
list_pages() {
  local targets
  targets=$(curl -sf "localhost:$port/json/list") || { echo "no browser answers CDP on :$port" >&2; exit 1; }
  node -e '
    for (const t of JSON.parse(process.argv[1])) if (t.type === "page") console.log(t.id + "\t" + t.url)' "$targets"
}
case "$action" in
  baseline)
    port=$(node "$(dirname "$0")/cdp-port.mjs")
    mkdir -p "$run_dir"
    echo "$port" > "$run_dir/cdp-port"
    list_pages > "$run_dir/tabs-baseline.tsv"
    echo "baseline: $(wc -l < "$run_dir/tabs-baseline.tsv" | tr -d ' ') page targets on CDP :$port"
    ;;
  cleanup)
    # The baseline's browser, never the current one: target ids of another browser all look new.
    port=$(cat "$run_dir/cdp-port" 2>/dev/null) || { echo "no baseline in $run_dir: run tabs.sh baseline first" >&2; exit 1; }
    pages=$(list_pages)
    while IFS=$'\t' read -r id url; do
      [[ -z $id ]] && continue
      if ! cut -f1 "$run_dir/tabs-baseline.tsv" | grep -qx "$id"; then
        curl -s "localhost:$port/json/close/$id" > /dev/null && echo "closed $url"
      fi
    done <<< "$pages"
    ;;
  *) echo "usage: tabs.sh baseline|cleanup <run-dir>" >&2; exit 2 ;;
esac
