# Send funds

A user sends a token from one of their accounts to an address: pick the token, the sender and the recipient, enter an amount, review the fee, and confirm. The transaction then shows in Activity.

## Sub-features

- `send-pick` chooses token, sender and recipient.
- `send-amount` enters an amount, with "Max" and the fee estimate.
- `send-confirm` reviews and signs; the popup shows the submitted state.
- `send-history` shows the transaction in Activity until it settles.

## How to get to it (user POV)

- The `Send` button in the dashboard or popup portfolio header, or on a token row.
- Direct routes in the popup: `popup.html#/send/token?from=<address>&to=<address>`, then `#/send/amount?from=…&to=…&tokenId=<tokenId>`.

## Driving it with agent-browser

Preconditions:

- `<sub1>` holds testTAO on Bittensor testnet, and `<sub2>` exists (see [Test accounts](./README.md#test-accounts)). Send between the wallet's own accounts. Without testTAO, skip this recipe and record the skip.
- The doctor passes.

- **Pick the token.** `ab tab new "$EXT/popup.html#/send/token?from=<sub1 address>&to=<sub2 address>"`, `ab wait --text "Select a token"`. Testnet tokens have no fiat value and sort low in a virtualised list, so their rows may not render until you search: fill `Search by token or network name` with `testTAO`, then click the `testTAO` row. The URL moves to `#/send/amount` with `tokenId=bittensor-testnet:substrate-native`.
- **Enter the amount.** Fill the amount field with a small value (`0.001`). `Estimated Fee` shows and `Review` enables. Screenshot.
- **Confirm.** Click `Review`. The URL moves to `#/send/confirm` with `amount` in planck. Check that the sender and recipient names on the confirm page are both declared test accounts, and click `Confirm`. The sign step is in the page, not a separate popup. The Confirm button is ready after about one second. The URL moves to `#/send/submitted` with `txId` and `networkId`; the page reads "Transfer in progress", then "Success" within about 15 seconds ("Included in block #…"). About 20 seconds later, finalisation turns it into "Confirmed in block #…": wait for "Success", not for "Included in".
- **Prove it.** `ab tab new "$EXT/dashboard.html#/tx-history"` lists the transfer. The `transactionsV2` store of the `Talisman` IndexedDB holds a row with that id; its `status` reaches `success`. Read it from a dashboard page: `ab eval 'new Promise(res => { const r = indexedDB.open("Talisman"); r.onsuccess = () => { const q = r.result.transaction("transactionsV2").objectStore("transactionsV2").get("<txId>"); q.onsuccess = () => res(q.result && { id: q.result.id, status: q.result.status }) } })'`.

## Gotchas

- This moves funds and cannot be undone: the transfer stays on chain. It costs a fee of under 0.0001 testTAO between two test accounts.
- Real funds on mainnet. Use testnets and test accounts only.
- The amount input is React-controlled. If `fill` leaves the review button disabled, set the value with the `HTMLInputElement.prototype.value` setter and dispatch `input`.
- Solana token ids read `solana-mainnet:sol-native` or `solana-mainnet:sol-spl:<mint>`. When unsure of an id, go through the token picker.
- The local subtensor devnet (`BITTENSOR_DEVNET_RPC`) loses its state when its container stops. No balance there means the node restarted.
- Hardware accounts (Ledger, Polkadot Vault) need a device. Leave them out of automated runs.
