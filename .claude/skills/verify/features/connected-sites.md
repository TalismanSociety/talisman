# Connected sites

A user reviews the sites that can see their accounts, changes which accounts each site sees, disconnects all accounts, or forgets a site.

## Sub-features

- `sites-list` lists each connected site with "N of M" connected accounts, split into Ethereum, Substrate and Solana tabs (Ethereum opens first).
- `sites-toggle` connects or disconnects one account for a site.
- `sites-disconnect-all` and `sites-connect-all` change every account at once.
- `sites-forget` removes the site; the dapp must ask again.

## How to get to it (user POV)

- Dashboard → Settings → Connected Sites: `dashboard.html#/settings/connected-sites`.
- The popup header shows the connection state of the current tab's site.

## Driving it with agent-browser

Preconditions:

- A site is connected. Run the connect steps of [Dapp connect and sign](./dapp-connect-sign.md) against `https://example.org` first (EVM and Substrate, to see both tabs).

- **Open the list.** `ab tab new "$EXT/dashboard.html#/settings/connected-sites"`, `ab wait --text "example.org"`. The row (button `<origin label> example.org 1 of N`) is an accordion: click it to reveal `Forget Site`, `Disconnect All` and `Connect All`. Screenshot.
- **Disconnect all.** Click `Disconnect All` in the expanded row (not the toolbar `Disconnect All Sites`). The count reads "0 of N". On the dapp tab, `ab eval 'window.talismanEth.request({ method: "eth_accounts" })'` returns `[]`.
- **Forget.** Click `Forget Site`, then `Forget Site` in the dialog. The row leaves this tab. Repeat on the Substrate tab when the site is connected there too.
- **Prove it.** `sw-eval.mjs 'chrome.storage.local.get("sitesAuthorized")'` has no `example.org` key. After the Ethereum forget alone, a Substrate connection remains (`addresses`, no `ethAddresses`, `ethPermissions` or `ethChainId`); the Substrate forget then deletes the key.

## Gotchas

- Ethereum, Substrate and Solana connections are listed apart; a site can appear in several tabs. `Forget Site` on the Ethereum tab clears `ethAddresses`, `ethPermissions` and `ethChainId` when the site also has Substrate `addresses`. On the Substrate tab it clears `addresses` and `connectAllSubstrate` when the site also has `ethAddresses`. In every other case, Solana included, it deletes the whole `sitesAuthorized` entry (`core/domains/sitesAuthorised/store.ts` `forgetSite`).
- The toolbar has `Forget All Sites` and `Disconnect All Sites` (a confirm dialog, button `Continue`). Neither has a Solana branch, so both do nothing on the Solana tab.
- `Connect All` is hidden on the Solana tab.
- `wallet_revokePermissions` from the dapp leaves an empty entry that only Forget Site removes.
- `Forget Site` appears twice: on the row and in the dialog. Click the dialog button last.
