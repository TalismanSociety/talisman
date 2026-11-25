# Ledger accounts on the emulator

A dev build can use Speculos, Ledger's emulator, in place of a Ledger device. With the Ledger interface set to "Speculos (emulator)", the user connects a Ledger account, then signs a dapp request with it by confirming on the emulator's screen. A rejection on the device and an emulator that is not running each show their own error in the popup. The [`ledger-emulator`](../../ledger-emulator/SKILL.md) skill starts the emulator and drives its screen. This file covers the wallet side.

## Sub-features

- `ledger-interface` sets the Ledger interface to Speculos in Settings → General, and `Check` tests the connection.
- `ledger-connect` adds a Ledger Ethereum account from the emulator.
- `ledger-sign-message` signs a dapp `personal_sign` after the user approves it on the device.
- `ledger-reject` shows a rejection on the device as "Transaction was rejected by the Ledger device.", and the request stays open.
- `ledger-unreachable` shows "Could not connect to the Ledger emulator at http://127.0.0.1:5001. Run pnpm ledger:emulator start." when the emulator is not running. The request stays open, and a retry signs once the emulator is back.

## How to get to it (user POV)

- `$EXT/dashboard.html#/settings/general` → `Ledger interface`. The `Speculos (emulator)` option exists in dev builds only.
- `$EXT/dashboard.html#/accounts/add` → `Connect Ledger`, or `#/accounts/add/ledger?platform=ethereum` with Ethereum already chosen.
- A dapp request signed by the Ledger account: its popup shows `Sign on Ledger` in place of `Approve`.

## Driving it with agent-browser

Preconditions:

- Docker runs, and the Ethereum app build exists. Start the emulator with the `ethereum` app as in the `ledger-emulator` skill ("1. Launch"), and record in `notes.md` whether this run started it.
- The emulator derives its accounts from `LEDGER_TEST_MNEMONIC`, or from the public Speculos phrase when that is unset (`ledger-emulator` skill, "2. Recovery phrase"). Sign with them only when your instructions allow it, as [Test accounts](./README.md#test-accounts) requires. Otherwise record `ledger-sign-message`, `ledger-reject` and `ledger-unreachable` as skipped in `notes.md`, and go from **Prove the account** to **Remove the account**. This recipe signs the message `hello` only. Never send a transaction from these accounts on a mainnet.
- Read the reference address before any wallet page talks to the device, because the emulator answers one client at a time: `sh scripts/ledger-emulator.sh eth-address 0 > "$RUN/device-eth-address-0.txt"`. When the keyring already holds that address (compare in lower case), the picker disables its row: record the account steps as skipped and go to **Restore**.

Steps:

- **Reach the emulator from a runner container.** The wallet calls `http://127.0.0.1:5001` only. In the main checkout, the dev Chrome reaches the emulator on that address directly. Skip this step there. A runner container has its own `127.0.0.1`, so relay the port into it:

  ```sh
  container=talisman-verify-wt-$(basename "$PWD" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9\n' '-')
  docker exec "$container" lsof -nP -iTCP:5001 -sTCP:LISTEN
  ```

  When `lsof` lists a listener, another run owns that relay: use it, and never stop or restart it. Otherwise start one, and record in `notes.md` that this run started it:

  ```sh
  speculos=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' talisman-speculos)
  docker exec -d "$container" socat TCP-LISTEN:5001,bind=127.0.0.1,fork,reuseaddr "TCP:$speculos:5000"
  ```

  The next step's `Check` is the proof that the relay works. To stop a relay this run started: `docker exec "$container" pkill -f '[T]CP-LISTEN:5001'`.
- **Choose the emulator.** Save the current value first: `sw-eval.mjs 'chrome.storage.local.get("settings").then((s) => s.settings.ledgerTransportType)'` (`"hid"` on a new profile). `ab tab new "$EXT/dashboard.html#/settings/general"`, then `ab wait --text "Ledger interface"`. The select's button is named after the current choice. Click it by that name (`ab find role button click --name "HID"` on a new profile), then `ab find role option click --name "Speculos (emulator)"`. Click `ab find role button click --name "Check"`, then `ab wait --text "SPECULOS connection successful"`. Screenshot, then `ab find role button click --name "Close"`. The same read now prints `"speculos"`.
- **Connect the account.** `ab tab new "$EXT/dashboard.html#/accounts/add/ledger?platform=ethereum"`, then `ab wait --text "Successfully connected to Ledger."` and `ab find role button click --name "Continue"`. Then `ab wait --text "Ledger Ethereum 1"`. The list has the rows `Ledger Ethereum 1` and `Ledger Ethereum 2`, each with a short address and a balance. `Continue` stays disabled until you select a row. Click `ab find role button click --name "Ledger Ethereum 1"`, then `ab find role button click --name "Continue"`, then `ab wait --fn 'location.hash.includes("portfolio")'`. The hash reads `#/portfolio?account=<address>`.
- **Prove the account.** Run `sw-eval.mjs 'chrome.storage.local.get("keyring").then(({keyring}) => keyring.accounts.filter((a) => a.address.toLowerCase() === "<address from eth-address 0, in lower case>"))'` and save the output. Expect one entry: `type: "ledger-ethereum"`, `name: "Ledger Ethereum 1"`, `derivationPath: "m/44'/60'/0'/0/0"`, and the address from `eth-address 0`.
- **Sign a message.** Connect `https://example.org` as in [Dapp connect and sign](./dapp-connect-sign.md). The popup lists `Ledger Ethereum 1` with the Ethereum accounts and preselects the wallet's first Ethereum account. Click the preselected row to clear it, then click `Ledger Ethereum 1`. The button reads `Connect 1` before and after, so check the selection in a screenshot. After the connection, `window.__res` holds exactly one address: the address from `eth-address 0`, in lower case.
  1. Send `personal_sign` (`0x68656c6c6f`) with that address.
  2. In the `#/eth-sign/<id>` popup, the signer reads `Ledger Ethereum 1`, and the buttons are `Cancel` and `Sign on Ledger`. Dismiss the risk drawer first, as in the dapp recipe.
  3. Click `Sign on Ledger`. Then wait until `sh scripts/ledger-emulator.sh screen` reads `Review message`.
  4. `press right` shows `Message | hello`, then `Sign message`.
  5. `sh scripts/ledger-emulator.sh approve` prints `Message signed`.

  The popup closes, and the result is a 132-character signature. To prove the signer, recover it from the repo root: `(cd apps/extension && node -e 'import("viem").then(async ({ recoverMessageAddress }) => console.log(await recoverMessageAddress({ message: "hello", signature: process.argv[1] })))' <signature>)`. It prints the Ledger address.
- **Reject on the device.** Send a second `personal_sign` and click `Sign on Ledger`. Wait for `Review message`, then run `sh scripts/ledger-emulator.sh reject`, which prints `Message rejected`. The popup shows "Transaction was rejected by the Ledger device." with `Close`. Screenshot. The request stays open, and `Sign on Ledger` stays enabled.
- **Emulator not running.** Click `Close` and wait one second. If this run did not start the emulator, or uses a runner relay it did not start, click `Cancel` to end the request, record `ledger-unreachable` as skipped, and go to **Remove the account**. Otherwise run `sh scripts/ledger-emulator.sh stop`, then click `Sign on Ledger`. The button spins for several seconds, then shows "Could not connect to the Ledger emulator at http://127.0.0.1:5001. Run pnpm ledger:emulator start.". Then:
  1. Run `sh scripts/ledger-emulator.sh start` again.
  2. In a runner container, stop the relay this run started, and start it again as in the first step.
  3. Click `Close` and wait one second.
  4. Click `Sign on Ledger` and approve on the device. The open request signs.
- **Remove the account.** `ab tab new "$EXT/dashboard.html#/portfolio/tokens?account=<ledger address>"`, then `ab wait --text "Ledger Ethereum 1"`. Remove the account through the header menu, as in [Watched account](./watched-account.md). The dialog reads "Confirm to remove account Ledger Ethereum 1.". The keyring read then prints `[]`, and the address also leaves `ethAddresses` of the site in `sitesAuthorized`.
- **Restore.** If this run changed `Ledger interface`, set it back to the saved value. Its button is now `Speculos (emulator)`, and the options are `HID`, `USB` and `Speculos (emulator)`. Check the saved value with the same storage read. If this run connected `example.org`, forget it on the Ethereum tab, as in [Connected sites](./connected-sites.md). Stop the relay and the emulator, each only if this run started it.

## Gotchas

- Do not stop the relay with `pkill socat` or `pkill -x socat`. The runner container's CDP relay on port 9224 is also `socat`, and killing it cuts the browser off from the host. If that happens, restart it: `docker exec -d "$container" socat TCP-LISTEN:9224,fork,reuseaddr TCP:127.0.0.1:9223`.
- The default Docker bridge has no container DNS: `TCP:talisman-speculos:5000` fails inside the runner container. Relay to the emulator container's IP address.
- `stop` removes the emulator container, and `start` creates a new one. Look up its IP address again before you restart the relay.
- The runner container has no `curl`. To check the relay without the wallet, run `docker exec "$container" node -e 'fetch("http://127.0.0.1:5001/events?currentscreenonly=true").then((r) => r.text()).then(console.log)'`.
- Wait for `Review message` before you press anything. On the home screen, `press-until 'Review'` walks right through the app menu and stops at `Quit app`. That menu does not wrap around, so press `left` until the screen reads `app is ready`.
- A drawer takes about a second to close. A click on `Sign on Ledger` right after `Close` fails with "is covered by".
- From source, not driven: the wrong-app error "Please open Ethereum app on your Ledger." (needs the Solana or Polkadot build), Polkadot and Solana Ledger accounts, and signing a transaction.
- An emulator result says nothing about WebHID or WebUSB.
