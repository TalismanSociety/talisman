#!/usr/bin/env bash
# Prints the URL of each open extension request popup (sign, connect and send requests), newest last.
# A request route ends in "<type>.<uuid>"; it skips popup.html pages you opened yourself, such as #/portfolio.
# Polls for up to ${1:-20} seconds because the popup target appears only after the service worker handles the request.
port=$(node "$(dirname "$0")/cdp-port.mjs") || exit 1
deadline=$(( $(date +%s) + ${1:-20} ))
while (( $(date +%s) < deadline )); do
  targets=$(curl -sf "localhost:$port/json/list") || { echo "no browser answers CDP on :$port" >&2; exit 1; }
  urls=$(node -e '
    for (const t of JSON.parse(process.argv[1]))
      if (t.type === "page" && /^chrome-extension:\/\/akcdepjilgckjbngkhjghfnmnnkdnmno\/popup\.html#\/[\w-]+\/[\w-]+\.[0-9a-f-]{36}$/.test(t.url))
        console.log(t.url)' "$targets")
  if [[ -n "$urls" ]]; then echo "$urls"; exit 0; fi
  sleep 1
done
echo "no extension popup on CDP :$port within ${1:-20}s" >&2
exit 1
