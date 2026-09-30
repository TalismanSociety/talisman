# Connected sites

A user reviews the sites that can see their accounts, changes which accounts each site sees, disconnects all accounts, or forgets a site.

## Sub-features

- `sites-list` lists each connected site with "N of M" connected accounts, split into Polkadot and Ethereum tabs.
- `sites-toggle` connects or disconnects one account for a site.
- `sites-disconnect-all` and `sites-connect-all` change every account at once.
- `sites-forget` removes the site; the dapp must ask again.

## How to get to it (user POV)

- Dashboard → Settings → Connected Sites: `dashboard.html#/settings/connected-sites`.
- The popup header shows the connection state of the current tab's site.

## Driving it with agent-browser

Preconditions:

- A site is connected. Run the connect steps of [Dapp connect and sign](./dapp-connect-sign.md) against `https://example.com` first.

- **Open the list.** `ab tab new "$EXT/dashboard.html#/settings/connected-sites"`, `ab wait --text "example.com"`. The row reads "1 of N". Screenshot.
- **Disconnect all.** Click `Disconnect All` on the `example.com` row. The count reads "0 of N". On the dapp tab, `ab eval 'window.talismanEth.request({ method: "eth_accounts" })'` returns `[]`.
- **Forget.** Click `Forget Site`, then `Forget Site` in the dialog. The row goes away.
- **Prove it.** `sw-eval.mjs 'chrome.storage.local.get("sitesAuthorized")'` has no `example.com` key.

## Gotchas

- Ethereum and Polkadot connections are listed apart; a site can appear in both tabs.
- `wallet_revokePermissions` from the dapp leaves an empty entry that only Forget Site removes.
- `Forget Site` appears twice: on the row and in the dialog. Click the dialog button last.
