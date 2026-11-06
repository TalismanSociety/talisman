# Swap

A user swaps one token for another, on one network or across networks: pick two tokens, an amount and the accounts, compare the providers' quotes, then confirm. A swap can take several signatures. The swap is a modal, with no route of its own.

## Sub-features

- `swap-quote` shows the output amount and the best rate for two tokens and an amount, with a picker of all providers.
- `swap-confirm` reviews sender, recipient, rate, fees and the plan.
- `swap-submit` signs on the Confirm step, with no separate popup, then shows the progress until the swap settles.
- `swap-plan` shows one numbered card per step when a swap needs more than one signature. A swap of one step has no number.

## How to get to it (user POV)

- The `Swap` button in the dashboard portfolio header, or on the Earn page.
- The popup: `Swap` in the bottom nav, or in the "Total Portfolio" card.

## Driving it with agent-browser

Preconditions:

- An account of each type the route needs. The recipient of a swap across account types is a second account: the form does not fill it in.
- For the signed route: `<sub1>` or `<sub2>` holds testTAO, and Bittensor Testnet is active, as in [Send funds](./send-funds.md). Turn it off again at cleanup if it was off.

Steps:

- **Open the modal.** `ab tab new "$EXT/dashboard.html#/portfolio/tokens"`, `ab wait --text "All Accounts"`. Mark the time as in [Analytics events](./analytics-events.md): the flow starts with the next click. `ab find role button click --name "Swap"`, `ab wait --text "Multi-Chain Swap"`.
- **Pick the tokens.** Click the first `Select Token` by its ref, `ab wait --text "Select a token"`, fill `Search by token or network name` and click the row by its ref. Pick `testTAO` on Bittensor Testnet, then, the same way, `TAO` on Subtensor EVM Testnet (search `Testnet`). That row can have an unticked `Enable TAO` checkbox, and it works without it. The form fills in the sender with the account that holds the most of the token: read it.
- **Enter the amount.** `ab fill '#swap-amount-input' 0.01`. When the form shows `Select Account` under the second token, click it by its ref and click a test account in the `Recipient` list.
- **Read the quote.** `ab wait --text "Best Rate"`. `Provider` shows `Bittensor EVM` and `1 testTAO = 1.00 TAO`. Screenshot. The provider button opens a `Provider` list with `Rate` and `Time` per provider. `Review` enables.
- **Review.** Click `Review` by its ref, then `ab wait --text "You swap"`. The title `Confirm` and the button `Confirm Swap` both hold "Confirm", so do not wait on that. `ab eval 'document.querySelector("#swap-modal-confirm").innerText'` shows `Sender`, `Recipient`, `You swap`, `You receive`, `Provider`, `Exchange Rate` and `Estimated TX Fee`, and one card with no number. Screenshot.
- **Sign.** Check that `Sender` and `Recipient` are both declared test accounts, then click `Confirm Swap` by its ref. It signs and submits at once. The modal reads "Transaction in progress", then "Swap complete" with "Confirmed in block #…" within about 45 seconds. `Close` closes it.
- **Prove it.** `ab tab new "$EXT/dashboard.html#/tx-history"`, `ab wait --text "Recent Activity"`: the swap is the top row, with status "Confirmed". With usage analytics on, the event log holds `swap_started` (`entry: dashboard`), `swap_step_viewed` for `form` and `confirm`, `swap_token_selected`, `swap_quote_received`, `tx_signed`, `tx_broadcast`, `swap_submitted` (`leg_count: 1`, `protocol: bittensor-evm`), `tx_settled` and `swap_completed` (`swap_status: finished`). All flow events share one `flow_id`.
- **Leave.** Open the modal again, reach the Confirm step, and press `Escape`: it closes the whole modal. `swap_abandoned` reads `abandon_cause: left` and `stage: confirm`, and `modal_closed` follows it with `dismiss: escape`. Closing the tab instead reads `abandon_cause: page_closed`.

To see a plan of two steps without a signature: swap `TAO` on Bittensor to `TAO` on Base, amount `0.1`, recipient `<evm1>`. Provider `ForeverMoney` quotes it. The Confirm step reads "This swap needs a signature for each step", with the cards `1` and `2`. Press `Escape`: do not sign it. It needs a sender with that TAO, and it costs about 6% of the amount.

## Gotchas

- Real funds on mainnet. Only the testnet route above is free. A mainnet swap from a declared test account also works: 1 USDC to ETH on Base cost under $0.01 in gas, and `Track swap progress` then opens the LI.FI tracker in a new tab.
- Read the provider before you click `Review`. From source, not driven: entering the Confirm step with SimpleSwap or StealthEX opens a real exchange with that provider, though no funds move. `TAO` to `USDC` on Base had SimpleSwap as its best rate.
- The sidebar stays behind the modal, and `find role button --name` matches it first: `"<evm2 name>"` hits the sidebar row and fails with "is covered by". Use a ref from the snapshot lines of the modal. The popup also has two `Swap` buttons: the bottom nav is the last one.
- A token with a risk warning opens a `Warning` drawer when you pick it, with `Back` and `I Understand`.
- `No route found. Try at least 0.139 TAO.` is the form's text for a low amount. The minimum changes with the price.
- The first EVM signature of a profile opens the `Automatic risk assessments` drawer over `Confirm Swap`: click `No` (`data-testid` `risk-analysis-button-no`) first.
- The first search in the token picker can return nothing while the list loads: search again.
- From source, not driven: signing a plan of several steps, `Sign` on each later step, `Finish the swap`, and the `Finish swap` prompt on the form for a swap left unfinished.
