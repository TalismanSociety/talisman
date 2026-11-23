# Copy address

A user copies one of their addresses, or shows it as a QR code, in the format of a chosen network. A Polkadot account has one address format per network, so the modal asks for the network. Ethereum and Solana addresses have one format and skip that step.

## Sub-features

- `copy-pick-account` lists the accounts when the modal opens with none chosen ("Select account").
- `copy-pick-network` lists the networks of a Polkadot account with its address in each format ("Select network"). `Back` returns to "Select account", and shows only when the modal opened with no account chosen.
- `copy-qr` shows the QR code and the address for one account and network ("Copy address"), with a `Copy Address` button.
- `copy-clipboard` copies the address, shows the toast "Address copied" and closes the modal.

## How to get to it (user POV)

- Popup: `Receive` in the "Total Portfolio" card opens "Select account".
- Dashboard: `Receive` in the portfolio header, which reads `Copy` for a watched account. With one account selected, the modal opens on that account. From source, not driven: with "All Accounts", it opens on "Select account".
- From source, not driven: the account's `…` menu → "Copy address", the icon button next to each account in the sidebar, and the icon button with the tooltip "Copy address" in the popup `#/portfolio/tokens` header.
- From source, not driven: an entry point that names an Ethereum or Solana account copies at once. No modal opens, only the toast.

## Driving it with agent-browser

Preconditions:

- `<sub1>` and `<sub2>` exist. The modal changes nothing in the wallet, so the recipe has no undo.

- **Open with no account.** `ab tab new "$EXT/popup.html#/portfolio"`, `ab wait --text "Total Portfolio"`. If "Expand has moved here" shows, `ab find role button click --name "Got it"` first: the coachmark hides `Receive`. The dismissal is stored: see the coachmark gotcha in [Portfolio](./portfolio.md). Then `ab find role button click --name "Receive"` and `ab wait --text "Select account"`. The modal is `#copy-address-modal`. No `Back` shows: `ab eval 'document.querySelectorAll("#copy-address-modal [aria-label=Back]").length'` is `0`.
- **Pick a Polkadot account.** In `ab snapshot -i -c -s '#copy-address-modal'`, a Polkadot account is one button named `<sub1 name>` followed by its short address. An Ethereum or Solana account row has two icon buttons with no name instead. Click `<sub1>` by its ref, then `ab wait --text "Select network"`. `Back` shows now. Screenshot.
- **Go back.** `ab find role button click --name "Back" --exact`, `ab wait --text "Select account"`. Click `<sub2>` by its ref from a new snapshot.
- **Pick a network.** `ab find placeholder "Search by network name" fill "Kusama"`. Each network row has two icon buttons with no name: the first opens the QR page, the second copies. `snapshot -i` lists only those buttons, so take `ab snapshot -c -s '#copy-address-modal'` without `-i` to see which network each pair belongs to.
- **QR page.** Click the first button of a row. The modal reads "Copy address", the `Account` and `Network` of the choice, "Your Kusama address" and the short address. Screenshot.
- **Copy.** Clear the clipboard first, so the read below proves this copy: `ab eval 'navigator.clipboard.writeText("cleared").then(() => "ok")'`. Then `ab find role button click --name "Copy Address" --exact`, `ab wait --text "Address copied"`. The modal closes about a second later.
- **Prove the clipboard.** agent-browser cannot read it: `navigator.clipboard.readText()` waits on a permission prompt until CDP times out. Grant the permission from Playwright and read it there, with this script in `.tmp/` run by `node` from the repo root:

  ```js
  import { chromium } from "@playwright/test"
  import { cdpPort } from "../.claude/skills/verify/bin/cdp-port.mjs"
  const browser = await chromium.connectOverCDP(`http://localhost:${cdpPort()}`)
  const context = browser.contexts()[0]
  const page = context.pages().find((p) => p.url().startsWith("chrome-extension://akcdepjilgckjbngkhjghfnmnnkdnmno/"))
  const cdp = await context.newCDPSession(page)
  await cdp.send("Browser.grantPermissions", { origin: "chrome-extension://akcdepjilgckjbngkhjghfnmnnkdnmno", permissions: ["clipboardReadWrite"] })
  await page.bringToFront()
  console.log(await page.evaluate(() => navigator.clipboard.readText()))
  await browser.close()
  ```

  It prints the full address in the network's format, not `cleared`: a Kusama address starts with a capital letter, not with `5`. Save it in `$RUN`.
- **Open with an account.** `ab tab new "$EXT/dashboard.html#/portfolio"`, select `<sub1>` in the sidebar, then `ab find role button click --name "Receive" --exact`. The modal opens on "Select network" with no `Back`. The second icon button of a row copies at once, with the same toast.

## Gotchas

- The page behind the modal holds the same account names. `ab find role button --name "<sub2 name>"` can match the portfolio row and fail with "is covered by". Click refs from `ab snapshot -i -c -s '#copy-address-modal'`.
- Product bug, seen on 2026-11-16: "Search by account name" finds nothing when the search has capitals. It lowercases the names but not the search (`CopyAddressAccountForm.tsx`). Search in lower case. Delete this line once the bug is fixed.
- From source: the Polkadot row shows only for some accounts. Search for another network, such as Kusama.
- From source, not driven: a copy on the "Substrate (Generic)" row opens the drawer "Receiving from an exchange?" with `Continue`, and a network whose address format changed opens "Select Address Format".
