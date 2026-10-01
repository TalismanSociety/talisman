#!/usr/bin/env bash
# Prints the URL of each open extension request popup (sign, connect and send requests), newest last.
# A request route ends in "<type>.<uuid>"; it skips popup.html pages you opened yourself, such as #/portfolio.
# Polls for up to ${1:-20} seconds because the popup target appears only after the service worker handles the request.
deadline=$(( $(date +%s) + ${1:-20} ))
while (( $(date +%s) < deadline )); do
  urls=$(curl -s localhost:9223/json/list | node -e '
    const targets = JSON.parse(require("fs").readFileSync(0, "utf8"))
    for (const t of targets)
      if (t.type === "page" && /^chrome-extension:\/\/akcdepjilgckjbngkhjghfnmnnkdnmno\/popup\.html#\/[\w-]+\/[\w-]+\.[0-9a-f-]{36}$/.test(t.url))
        console.log(t.url)')
  if [[ -n "$urls" ]]; then echo "$urls"; exit 0; fi
  sleep 1
done
echo "no extension popup within ${1:-20}s" >&2
exit 1
