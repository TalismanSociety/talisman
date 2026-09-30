# Portfolio

A user sees the fiat total and token balances of all accounts, or of one account, with per-token detail. The dashboard and the popup show the same data in two layouts.

## Sub-features

- `portfolio-total` shows the total over "All Accounts" and per account in the sidebar.
- `portfolio-tokens` lists token balances for the selected account, with search and sort.
- `portfolio-token-detail` opens one token with its per-network and per-account breakdown.
- `portfolio-nfts` and `portfolio-defi` show the NFTs and DeFi tabs.

## How to get to it (user POV)

- Dashboard: `dashboard.html#/portfolio` (tokens at `#/portfolio/tokens`, one account with `?account=<address>`).
- Popup: `popup.html#/portfolio`.
- Token detail: click a token row, or `#/portfolio/tokens/<symbol>`.

## Driving it with agent-browser

Preconditions:

- The wallet is unlocked and holds the `Guardians` accounts.

- **Open all accounts.** `ab tab new "$EXT/dashboard.html#/portfolio"`, `ab wait --text "All Accounts"`. The sidebar lists each account with a fiat value. Screenshot.
- **Select one account.** `ab find text "Guardians SUB" click`. The URL gains `?account=<address>` and the header shows `Guardians SUB` with its total. Wait for the token rows: skeleton rows show while balances load.
- **Search.** `ab find placeholder "Search" fill "TAO"`. Only matching tokens stay.
- **Open a token.** Click a token row. The page shows per-network rows for that token.
- **Cross-check.** The same account in the popup: `ab tab new "$EXT/popup.html#/portfolio"`. The total matches the dashboard within the rounding of the currency.
- **Prove the data source.** `sw-eval.mjs 'chrome.storage.local.get("balanceTotals").then(({balanceTotals}) => balanceTotals["<address>::usd"])'` returns `{ address, currency, total }` for that account. Its `total` matches the sidebar value.

## Gotchas

- Balances stream in: a total read in the first seconds is partial. Wait until the value stops changing between two screenshots.
- The pool connects to chains only while a UI page is subscribed. A background read with no page open can be stale.
- Lock rows render with CSS `capitalize`: the stored label is lower case.
- Testnet tokens show under their account like mainnet tokens; they have no fiat value.
