# Dapp connect and sign

A web page asks Talisman for accounts, and then for a signature, through the providers the extension injects: `window.talismanEth` (EIP-1193, also announced over EIP-6963 and set on `window.ethereum` when that is free), `window.injectedWeb3.talisman` (Polkadot), and a Solana wallet-standard wallet. The user answers each request in a popup.

## Sub-features

- `dapp-connect-evm` authorises EVM accounts for a site (`eth_requestAccounts`).
- `dapp-connect-substrate` authorises Substrate accounts (`injectedWeb3.talisman.enable`).
- `dapp-sign-message` signs a message (`personal_sign`).
- `dapp-reject` rejects a request; the page receives an error.

## How to get to it (user POV)

- Any `https://` page. The dapp calls the provider; Talisman opens `popup.html#/auth/<id>` for a connection and `popup.html#/eth-sign/<id>` (or `substrate-sign`, `sol-sign`, `eth-send`) for a signature.

## Driving it with agent-browser

Preconditions:

- `https://example.com` is not yet a connected site (`sw-eval.mjs 'chrome.storage.local.get("sitesAuthorized").then(s => Object.keys(s.sitesAuthorized ?? s))'`).

- **Open the dapp.** `ab tab new "https://example.com"`. `ab eval 'typeof window.talismanEth'` returns `"object"`.
- **Request accounts without blocking.** `ab eval 'window.__req = window.talismanEth.request({ method: "eth_requestAccounts" }).then(r => (window.__res = r), e => (window.__err = e.message)); "sent"'`.
- **Answer the popup.** `.claude/skills/verify/bin/popup-url.sh` prints `…/popup.html#/auth/<id>`. `ab tab new "<that url>"`, `ab snapshot -i -c`. Select a `Guardians EVM` account row, then click the button named `Connect 1`. Both popup tabs close.
- **Prove the connection.** Back on the dapp tab: `ab eval 'window.__res'` returns an array with the Guardians EVM address. `sitesAuthorized` now has an `example.com` entry.
- **Sign a message.** `ab eval 'window.__sig = window.talismanEth.request({ method: "personal_sign", params: ["0x68656c6c6f", window.__res[0]] }).then(r => (window.__sigRes = r), e => (window.__sigErr = e.message)); "sent"'`. Open the `#/eth-sign/<id>` popup the same way, check that the signer name contains `Guardians`, click `Approve`. `ab eval 'window.__sigRes'` is a `0x…` signature of 132 characters.
- **Reject.** Send a second `personal_sign`, click `Cancel` in its popup. `window.__sigErr` reads "User Rejected Request".
- **Undo.** Forget `example.com` as in [Connected sites](./connected-sites.md).

## Gotchas

- `ab eval` awaits a returned promise. Store the promise in `window` and return a string, else the command blocks until someone answers the popup.
- agent-browser does not list popups the extension opens. `popup-url.sh` finds them; open the URL in a new tab to drive it.
- A script that awaits the Approve click never returns: the popup closes itself. Put a timeout on any Playwright evaluate in a popup.
- A dapp request that hangs with no popup is a stale service worker: run the doctor.
- `wallet_revokePermissions` leaves an empty `sitesAuthorized` entry. Forget the site in Settings for a clean state.
- Dapp-signed Substrate transactions show in Activity as "Unknown": expected.
