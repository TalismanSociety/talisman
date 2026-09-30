#!/usr/bin/env bash
# Prints the URL of each open extension popup (sign, connect and send requests), newest last.
# Polls for up to ${1:-20} seconds because the popup target appears only after the service worker handles the request.
deadline=$(( $(date +%s) + ${1:-20} ))
while (( $(date +%s) < deadline )); do
  urls=$(curl -s localhost:9223/json/list | node -e '
    const targets = JSON.parse(require("fs").readFileSync(0, "utf8"))
    for (const t of targets)
      if (t.type === "page" && t.url.startsWith("chrome-extension://akcdepjilgckjbngkhjghfnmnnkdnmno/popup.html#/"))
        console.log(t.url)')
  if [[ -n "$urls" ]]; then echo "$urls"; exit 0; fi
  sleep 1
done
echo "no extension popup within ${1:-20}s" >&2
exit 1
