#!/usr/bin/env bash
# tabs.sh baseline <run-dir>: records the page targets open before the run.
# tabs.sh cleanup <run-dir>:  closes every page target that is not in the baseline.
set -euo pipefail
cdp=localhost:${VERIFY_CDP_PORT:-9223}
action=${1:?usage: tabs.sh baseline|cleanup <run-dir>}
run_dir=${2:?usage: tabs.sh baseline|cleanup <run-dir>}
list_pages() {
  curl -s "$cdp/json/list" | node -e '
    const targets = JSON.parse(require("fs").readFileSync(0, "utf8"))
    for (const t of targets) if (t.type === "page") console.log(t.id + "\t" + t.url)'
}
case "$action" in
  baseline)
    mkdir -p "$run_dir"
    list_pages > "$run_dir/tabs-baseline.tsv"
    echo "baseline: $(wc -l < "$run_dir/tabs-baseline.tsv" | tr -d ' ') page targets"
    ;;
  cleanup)
    list_pages | while IFS=$'\t' read -r id url; do
      if ! cut -f1 "$run_dir/tabs-baseline.tsv" | grep -qx "$id"; then
        curl -s "$cdp/json/close/$id" > /dev/null && echo "closed $url"
      fi
    done
    ;;
  *) echo "usage: tabs.sh baseline|cleanup <run-dir>" >&2; exit 2 ;;
esac
