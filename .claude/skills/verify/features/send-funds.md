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

- A `Guardians` sender with a testnet balance (for example testTAO on Bittensor testnet), and a second `Guardians` account as the recipient. Send between the wallet's own accounts.
- The doctor passes.

- **Pick the token.** `ab tab new "$EXT/popup.html#/send/token?from=<Guardians SUB>&to=<Guardians SUB 2>"`, `ab wait --text "Select a token"`, click the testnet token row. The URL moves to `#/send/amount` with a `tokenId`.
- **Enter the amount.** Fill the amount field with a small value (`0.001`). A fee row appears and the review button enables. Screenshot.
- **Confirm.** Click the review button, check the sender and recipient names on the confirm page (both `Guardians`), and confirm. The sign step is in the page, not a separate popup. The URL moves to `#/send/submitted` and carries `txId`.
- **Prove it.** `ab tab new "$EXT/dashboard.html#/tx-history"` lists the transfer. The `transactionsV2` store of the `Talisman` IndexedDB holds a row with that id; its `status` reaches `success`. Read it from a dashboard page with `ab eval` and Dexie-free IndexedDB code, or with a Playwright evaluate.

## Gotchas

- Real funds on mainnet. Use testnets and `Guardians` accounts only.
- The amount input is React-controlled. If `fill` leaves the review button disabled, set the value with the `HTMLInputElement.prototype.value` setter and dispatch `input`.
- Solana token ids read `solana-mainnet:sol-native` or `solana-mainnet:sol-spl:<mint>`. When unsure of an id, go through the token picker.
- The local subtensor devnet (`BITTENSOR_DEVNET_RPC`) loses its state when its container stops. No balance there means the node restarted.
- Hardware accounts (Ledger, Polkadot Vault) need a device. Leave them out of automated runs.
