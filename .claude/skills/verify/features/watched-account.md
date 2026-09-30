# Watched account

A user adds an address they do not own to follow its balances, then removes it. The account has no keys: it cannot sign.

## Sub-features

- `watch-add` adds a watch-only account for an Ethereum, Substrate or Solana address.
- `watch-portfolio` shows the new account's portfolio right after the add.
- `watch-remove` removes the account from its context menu.

## How to get to it (user POV)

- Dashboard → Settings → Manage Accounts → `+`, or the `+` next to "Accounts" in the portfolio sidebar: both open `#/accounts/add`, then "Watch".
- Direct route: `dashboard.html#/accounts/add/watched?platform=ethereum|polkadot|solana`.
- Remove: the `…` button in the portfolio header of the account, or in Settings → Manage Accounts.

## Driving it with agent-browser

Preconditions:

- No account named `Verify Watched` and no account with address `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY` (check with the keyring read below: it prints `[]`).

- **Open the method picker.** `ab tab new "$EXT/dashboard.html#/accounts/add"`, `ab wait --text "Add a watched account"`, `ab find role button click --name "Watch Add a watched account"`. Three buttons appear: `Watch Ethereum Account`, `Watch Substrate Account`, `Watch Solana Account`.
- **Fill the form.** `ab find role button click --name "Watch Substrate Account"`, `ab wait --text "Add a watched Substrate account"`, `ab find placeholder "Choose a name" fill "Verify Watched"`, `ab find placeholder "Enter wallet address" fill "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"`. The `Add` button becomes enabled. Screenshot `01-form-filled.png`.
- **Add.** `ab find testid account-add-watched-button click`, `ab wait --fn 'location.hash.includes("portfolio")'`. The URL is `#/portfolio/tokens?account=5Grw…`, the header reads `Verify Watched`, a toast reads "Account added". Screenshot `02-after-add.png`.
- **Prove storage.** `sw-eval.mjs 'chrome.storage.local.get("keyring").then(({keyring}) => keyring.accounts.filter(a => a.name === "Verify Watched").map(({type, name, address, isPortfolio}) => ({type, name, address, isPortfolio})))' > "$RUN/03-keyring-after-add.json"`. One entry, `type: "watch-only"`, `isPortfolio: false`.
- **Remove.** In `ab snapshot -i -c`, the header menu is the `button [expanded=false]` just before `button "$"`. `ab click @<that ref>`, `ab wait --text "Remove account"`, `ab find text "Remove account" click`, `ab wait --text "Confirm to remove account"`. Read the account name in the dialog (`Verify Watched`) before `ab find role button click --name "Remove" --exact`.
- **Prove removal.** Run the keyring read again: `[]`. Save as `07-keyring-after-remove.json`.

## Gotchas

- The picker button reads "Add a watched account" in lower case. The e2e fixture's `getByText("Add a Watched Account")` matches only because Playwright ignores case.
- `isPortfolio: false` puts the account under "Followed only" in the sidebar, not in the "All Accounts" total.
- The account menu trigger has no accessible name. Find it by position in the snapshot, not by name.
- Only `watch-add` for Substrate was driven. Ethereum accepts an ENS name (`vitalik.eth`) in the address field.
