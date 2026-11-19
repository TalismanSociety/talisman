---
name: ledger-emulator
description: Run and drive a virtual Ledger device (Speculos in Docker) for Talisman extension work. Start it with the test recovery phrase, connect a dev build of the wallet to it, read its screen, press buttons, approve or reject a review, send APDUs, get reference addresses and signatures. Use for Ledger signing questions, Connect Ledger or Ledger signing flows, checking what the device shows for a payload, producing Ledger test vectors, the Ledger e2e tests, or any run that needs a Ledger without hardware.
---

# Ledger emulator

[`docs/ledger-emulator.md`](../../../docs/ledger-emulator.md) is the engineer reference: prerequisites, setup, connecting the extension, the e2e tests and the command table. This skill adds the run discipline for an agent.

Every command runs from the repo root through `scripts/ledger-emulator.sh` (`pnpm ledger:emulator <command>`). In agent tool calls, run `sh scripts/ledger-emulator.sh` directly: `pnpm` prints a banner that gets in the way of parsing the output.

## Scope

Dev builds of the extension (`pnpm dev`, `pnpm build:extension`) connect to the emulator over HTTP in place of WebHID or WebUSB. Choose **Speculos (emulator)** in Settings → General → Ledger interface. The wallet then talks to `http://127.0.0.1:5001` only, so never change `SPECULOS_API_PORT` for a wallet run. Start the emulator with the app for the account type: it runs one app at a time. This path does not exercise WebHID or WebUSB, so a result from it says nothing about them. Canary and production builds have no emulator.

A browser in a Docker container, such as the `verify` skill's worktree runner, reaches the emulator only if the container shares the host network: otherwise its `127.0.0.1` is its own. Check with `curl -s 127.0.0.1:5001/events` inside the container. If it fails, drive the wallet with Playwright on the host, as `playwright/e2e-tests/ledger-emulator.spec.ts` does.

## 1. Launch

```sh
sh scripts/ledger-emulator.sh status
```

- Every line `PASS`: reuse the running emulator. It belongs to whoever started it, so leave it running when you finish.
- `FAIL docker`: Docker is not running. Ask the user to start it. Do not work around it.
- `FAIL container`: start it.

```sh
sh scripts/ledger-emulator.sh start            # Ethereum app, Nano X
sh scripts/ledger-emulator.sh start polkadot   # Polkadot generic app
sh scripts/ledger-emulator.sh start solana     # Solana app
sh scripts/ledger-emulator.sh start <path>.elf # an app built locally
```

A missing app build fails with `not found (run: pnpm ledger:emulator fetch-apps)`. Run `fetch-apps`, then start again.

A `start` for another app or model than the running emulator fails and names the running one. Stop it only if this run started it. Otherwise ask the user.

Record in your notes whether this run started the emulator. Stop it at the end only if it did. `pnpm test:e2e:ledger` stops any running emulator, so ask before you run it on an emulator you did not start.

## 2. Recovery phrase

The phrase is `LEDGER_TEST_MNEMONIC`, from the environment or `apps/extension/.env`. When it is unset, the script uses the public Speculos default phrase and says so on stderr.

- **Never print, echo, log or commit the phrase**, and never put it in a command line. It reaches the container by variable name only.
- **Never copy it into the extension**: not into a build variable, a source file, a test fixture or wallet storage.
- To tell the user which accounts a run used, name the address (`eth-address <index>`), not the phrase.
- Never write a phrase into `.env` yourself. Ask the user to add a throwaway, testnet-only phrase.

## 3. Drive the device

Read the screen before and after every action. Screen text is the evidence, so quote it in your report.

```sh
sh scripts/ledger-emulator.sh screen
sh scripts/ledger-emulator.sh press right       # next screen; prints the new screen
sh scripts/ledger-emulator.sh press both        # confirm the current screen
sh scripts/ledger-emulator.sh press-until 'Network' 15
```

A request that needs approval waits until the device answers, so send it in the background and drive the review in the foreground:

```sh
sh scripts/ledger-emulator.sh apdu <hex> > .tmp/ledger-response.txt &
sh scripts/ledger-emulator.sh press-until '^Sign' 30
sh scripts/ledger-emulator.sh approve
cat .tmp/ledger-response.txt
```

For a wallet flow, click the wallet's "Sign on Ledger" button, wait until `screen` shows the review (`Review …`), then drive it. `approve` called on the home screen presses through the app menus.

Walk the review with `press right` and check each field against the request (amount, recipient, network) before `approve`. A mismatch is the finding: reject, don't sign. Use `approve` alone only when the review content does not matter to the task.

The response hex ends with the status word. `9000` is success. `6985` means the user rejected.

EVM transactions with calldata (ERC-20 transfers, swaps, contract calls) need blind signing on: run `enable-blind-signing` once per container start. With it off, the device shows `Blind signing must be enabled in settings` and the APDU fails with `6a80`. Plain ETH transfers sign either way.

When text is ambiguous, `screenshot .tmp/ledger.png` and read the image.

## 4. Stop

```sh
sh scripts/ledger-emulator.sh stop
```

Only for an emulator this run started. Stopping drops device settings such as blind signing.

## Gotchas

- **Port 5000** on macOS belongs to AirPlay Receiver. The API is on host port 5001. A `curl localhost:5000` that answers with a 403 is AirPlay, not Speculos.
- **Device model.** `SPECULOS_MODEL` must match the build. Stax, Flex and Apex have touch screens and ignore `press`. Drive them with `POST /finger` (doc, "The REST API").
- **No PIN or onboarding.** Speculos starts the app unlocked, so a task step that sets up a PIN does not apply.
- **The device is deterministic.** The same phrase, path and payload give the same signature on every run. A changed signature means a changed input.
- **Speculos does not log APDUs.** To prove what reached it, watch the browser's requests to `127.0.0.1:5001`.
