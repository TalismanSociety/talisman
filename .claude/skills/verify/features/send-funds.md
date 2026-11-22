# Send funds

A user sends a token from one of their accounts to an address: pick the token, the sender and the recipient, enter an amount, review the fee, and confirm. The transaction then shows in Activity.

## Sub-features

- `send-pick` chooses token, sender and recipient.
- `send-amount` enters an amount, with "Max" and the fee estimate.
- `send-confirm` reviews and signs; the popup shows the submitted state.
- `send-history` shows the transaction in Activity until it settles.
- `send-from-token`: Send on a token's page lists only that token's networks and positions in the picker. Its search starts empty and cannot reach another token.

## How to get to it (user POV)

- The `Send` button in the dashboard or popup portfolio header. On a token's page that has a price chart, the chart takes the header's place, with no `Send`.
- On a token's page (`#/portfolio/tokens/<symbol>`, dashboard or popup): the toolbar icon with the tooltip "Send <symbol>" opens the picker limited to that token. The icon with the tooltip "Send" on each network block of that page picks the token and skips the picker. Both icons have no accessible name, so hover them by ref and read the tooltip. A row of the portfolio token list has no Send.
- The dashboard header `Send` and these icons open the wizard in a popup window at `popup.html#/send?entry=…`.
- Direct routes in the popup: `popup.html#/send/token?from=<address>&to=<address>`, then `#/send/amount?from=…&to=…&tokenId=<tokenId>`.

## Driving it with agent-browser

Preconditions:

- `<sub1>` holds testTAO on Bittensor testnet, and `<sub2>` exists (see [Test accounts](./README.md#test-accounts)). testTAO is an active token: the Send picker lists active tokens only and has no toggle to enable one. Send between the wallet's own accounts. Without testTAO, skip this recipe and record the skip.
- Bittensor Testnet is an active network. A new profile has every testnet off, and the picker then reads "No token matches your search" for `testTAO`. Turn it on in `$EXT/dashboard.html#/settings/networks-tokens/networks`: fill `Search networks` with `Bittensor` and tick the checkbox of the `Bittensor Testnet` row. On a reused profile, untick it again at cleanup if it was off.
- The doctor passes.

- **Pick the token.** `ab tab new "$EXT/popup.html#/send/token?from=<sub1 address>&to=<sub2 address>"`, `ab wait --text "Select a token"`. Testnet tokens have no fiat value and sort low in a virtualised list, so their rows may not render until you search: fill `Search by token or network name` with `testTAO`, then click the `testTAO` row. The URL moves to `#/send/amount` with `tokenId=bittensor-testnet%3Asubstrate-native`: the colon is encoded.
- **Enter the amount.** Fill the amount field (placeholder `0`) with a small value (`0.001`). Under `Estimated Fee`, "Validating Transaction" turns into the fee, and `Review` (`data-testid` `component-review-button`) enables. Screenshot.
- **Confirm.** Click `Review`, then `ab wait --text "You are sending"`: the page title is also "Confirm", so do not wait on that. The URL moves to `#/send/confirm` with `amount` in planck (`1000000` for 0.001 testTAO). Check that the sender and recipient names on the confirm page are both declared test accounts, and click `ab find role button click --name "Confirm" --exact`. The sign step is in the page, not a separate popup. The Confirm button is ready after about one second. The URL moves to `#/send/submitted` with `txId` and `networkId`; the page reads "Transfer in progress", then "Success" within about 15 seconds ("Included in block #…"). About 20 seconds later, finalisation turns it into "Confirmed in block #…": wait for "Success", not for "Included in".
- **Prove it.** `ab tab new "$EXT/dashboard.html#/tx-history"`, `ab wait --text "Recent Activity"`: the transfer is the top row, with status "Confirmed". The `transactionsV2` store of the `Talisman` IndexedDB holds a row with that id; its `status` reaches `success`. Read it from a dashboard page: `ab eval 'new Promise(res => { const r = indexedDB.open("Talisman"); r.onsuccess = () => { const q = r.result.transaction("transactionsV2").objectStore("transactionsV2").get("<txId>"); q.onsuccess = () => res(q.result && { id: q.result.id, status: q.result.status }) } })'`.
- **Send from a token's page.** This step only reads. It needs a token whose toolbar Send icon is enabled: the wallet's own accounts hold some of it transferable. The steps use TAO. `ab tab new "$EXT/dashboard.html#/portfolio/tokens/TAO"`, and wait until the balances stop changing: the page reads the token ids when you click. Hover the toolbar icons by ref until one shows "Send TAO". agent-browser does not list the window that the click opens, and `popup-url.sh` does not print it either, so record the browser's targets first: `curl -s "localhost:$(.claude/skills/verify/bin/cdp-port.mjs)/json/list" > "$RUN/targets-before.json"`. Click the icon, wait 3 seconds, and print the URL of the new window:

  ```sh
  curl -s "localhost:$(.claude/skills/verify/bin/cdp-port.mjs)/json/list" | node -e 'const before = new Set(require(process.argv[1]).map((t) => t.id)); for (const t of JSON.parse(require("fs").readFileSync(0))) if (!before.has(t.id) && t.url.includes("popup.html#/send")) console.log(t.url)' "$PWD/$RUN/targets-before.json"
  ```

  No output means the click opened nothing. Open the URL with `ab tab new`. The URL has one `tokenIds=` per id, and with an account selected it also has `from=`. The tab moves to `#/send/token`, with the search box empty. Each row's `data-id` is one of those ids. Some ids have no row, because only tokens with a transferable balance are listed. Search a symbol of another token, such as `USDC`: the picker reads "No token matches your search". With no account selected, a network block's "Send" icon opens `#/send?…&tokenId=<id>` instead, which goes on to `#/send/from`. An icon whose tooltip reads "No tokens available to send" opens nothing.

## Gotchas

- This moves funds and cannot be undone: the transfer stays on chain. It costs a fee of under 0.0001 testTAO between two test accounts.
- Real funds on mainnet. Use testnets and test accounts only.
- The amount input is React-controlled. If `fill` leaves the review button disabled, set the value with the `HTMLInputElement.prototype.value` setter and dispatch `input`.
- Solana token ids read `solana-mainnet:sol-native` or `solana-mainnet:sol-spl:<mint>`. When unsure of an id, go through the token picker.
- The picker lists only tokens with a transferable balance. With Bittensor Testnet on, it still reads "No token matches your search" for `testTAO` until the wallet has loaded that balance, and the dashboard portfolio has no `testTAO` row either. Seen on 2026-11-10 for over 20 minutes: both testnet RPCs took 8 to 14 seconds per request, and the service worker console repeated "MiniMetadata is required for fetching substrate-dtao balances on bittensor-testnet". Time one request before you blame the recipe: `curl -s -o /dev/null -w '%{time_total}\n' -H 'content-type: application/json' -d '{"id":1,"jsonrpc":"2.0","method":"chain_getHeader","params":[]}' https://test.finney.opentensor.ai`. When it takes seconds, record the recipe as unreachable.
- The local subtensor devnet (`BITTENSOR_DEVNET_RPC`) loses its state when its container stops. No balance there means the node restarted.
- Hardware accounts (Ledger, Polkadot Vault) need a device. Leave them out of automated runs.
