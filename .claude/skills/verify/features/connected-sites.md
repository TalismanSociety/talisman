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

- A site is connected. Run the connect steps of [Dapp connect and sign](./dapp-connect-sign.md) against `https://example.org` first (EVM, Substrate and Solana, to see all three tabs).

- **Open the list.** `ab tab new "$EXT/dashboard.html#/settings/connected-sites"`, `ab wait --text "example.org"`. The row is an accordion button whose name ends in `example.org 1 of N`; an origin label may come first (`smoke example.com 1 of 4`), and a Solana connect clears it. Match the row on the host. Click it to reveal `Forget Site`, `Disconnect All` and `Connect All`. Screenshot.
- **Disconnect all.** Click `Disconnect All` in the expanded row (not the toolbar `Disconnect All Sites`). The count reads "0 of N". On the dapp tab, `ab eval 'window.talismanEth.request({ method: "eth_accounts" })'` returns `[]`.
- **Forget on Solana.** `ab find role button click --name "Solana" --exact`, expand the row, click `Forget Site`, then `Forget Site` in the dialog. The row leaves this tab. `sitesAuthorized["example.org"]` loses `solAddresses` and keeps `addresses`, `ethAddresses` and `ethPermissions`.
- **Forget on Ethereum, then Substrate.** Same clicks on each tab. After the Ethereum forget, the entry keeps `addresses` and has no `ethAddresses`, `ethPermissions` or `ethChainId`. The Substrate forget then deletes the key.
- **Prove it.** `sw-eval.mjs 'chrome.storage.local.get("sitesAuthorized")'` has no `example.org` key.

## Gotchas

- Ethereum, Substrate and Solana connections are listed apart; a site can appear in several tabs. `Forget Site` on the Ethereum tab clears `ethAddresses`, `ethPermissions` and `ethChainId` and keeps the Substrate `addresses`. On the Substrate tab it clears `addresses` and `connectAllSubstrate`. On the Solana tab it clears `solAddresses`. Each keeps the other providers' fields. The entry is deleted only when none of `addresses`, `ethAddresses` and `solAddresses` remains; an empty array still counts (`core/domains/sitesAuthorised/store.ts` `forgetSite`).
- From source, not driven: the toolbar `Forget All Sites` and `Disconnect All Sites` on the Solana tab clear or empty `solAddresses` on every site. Leave them out of a run on a shared profile.
- The toolbar has `Forget All Sites` and `Disconnect All Sites`. Each opens a confirm dialog; its button is `Continue`.
- `Connect All` is hidden on the Solana tab.
- `wallet_revokePermissions` from the dapp leaves an empty entry that only Forget Site removes.
- `Forget Site` appears twice: on the row and in the dialog. Click the dialog button last.
