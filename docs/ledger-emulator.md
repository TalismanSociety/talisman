# Ledger emulator (Speculos)

You can develop and test Ledger flows without a physical device. [Speculos](https://github.com/LedgerHQ/speculos) is Ledger's own emulator. It runs the real device apps (Ethereum, Polkadot, Solana) and serves the device over HTTP. `scripts/ledger-emulator.sh` (`pnpm ledger:emulator`) runs it in Docker and drives it: start, read the screen, press buttons, approve, send APDUs.

Dev builds of the extension can connect to it in place of a USB or HID Ledger. Use it to run Connect Ledger and the signing flows, to see what a Ledger app shows and returns for a payload, and to produce reference addresses and signatures.

## Prerequisites

- **Docker**, running. The image `ghcr.io/ledgerhq/speculos` is published for amd64 and arm64.
- **`gh`**, signed in, to download the app builds. The Polkadot and Solana builds are GitHub Actions artifacts, which GitHub serves only to signed-in users.
- **`curl`** and **`jq`**, for every command that talks to the emulator.

Speculos serves its API on port 5000 inside the container. The script publishes it on host port **5001**, because macOS AirPlay Receiver listens on 5000. The extension connects to `http://127.0.0.1:5001` only, so keep the default port when you use the extension.

## Setup

1. Choose a recovery phrase for testing. **Use a throwaway phrase that has never held mainnet funds and never will.** It is stored in plain text and passed to the emulator. Fund its accounts only from testnet faucets.

   The script passes the phrase to the container as an environment variable, so it never appears on a host command line. Inside the container it is visible: `docker inspect` lists the container's environment.

2. Add it to `apps/extension/.env` (see `apps/extension/.env.sample`):

   ```sh
   LEDGER_TEST_MNEMONIC="word1 word2 … word24"
   ```

   An `export ` prefix and surrounding quotes are accepted. `LEDGER_TEST_MNEMONIC` in the environment takes precedence. The phrase must have 12, 18 or 24 words, or `start` fails without printing it. Leave it unset to use the public Speculos default phrase (`glory promote mansion …`). Everyone shares that phrase, so its testnet balances are not yours to rely on.

3. Download the app builds:

   ```sh
   pnpm ledger:emulator fetch-apps
   ```

   They go to `~/.cache/talisman/ledger-apps/`, one `.elf` per device model:
   - `ethereum-<version>/`: the Ethereum app release pinned in the script ([app-ethereum releases](https://github.com/LedgerHQ/app-ethereum/releases)).
   - `polkadot/`: the Polkadot generic app from the newest CI build on `main` of [LedgerHQ/app-polkadot](https://github.com/LedgerHQ/app-polkadot).
   - `solana/`: the Solana app from the newest CI build on `master` of [LedgerHQ/app-solana](https://github.com/LedgerHQ/app-solana).

   Run it again to get newer Polkadot and Solana builds. It skips downloads it already has. See [CI-built apps](#ci-built-apps).

4. Start the emulator and check it:

   ```sh
   pnpm ledger:emulator start
   pnpm ledger:emulator status
   pnpm ledger:emulator eth-address 0
   ```

   `status` prints one `PASS` or `FAIL` line per check. `eth-address 0` prints the address at `m/44'/60'/0'/0/0`. With the default phrase that address is `0xDad77910DbDFdE764fC21FCD4E74D71bBACA6D8D`.

5. To sign EVM transactions with calldata, turn on blind signing in the Ethereum app. The wallet signs EVM transactions without clear-signing metadata (`signTransaction(path, tx, null)` in `apps/extension/src/ui/hooks/ledger/useLedgerEthereum.ts`). A plain ETH transfer signs either way. An ERC-20 transfer or a swap shows `Blind signing must be enabled in settings` and fails with status `6a80` until the setting is on. A real device needs the same setting.

   ```sh
   pnpm ledger:emulator enable-blind-signing
   ```

   The setting lasts until the container stops.

## Connect the extension

The emulator is a choice of the Ledger interface setting, next to HID and USB. Dev builds have it: `pnpm dev`, and `pnpm build:extension`, which the e2e tests load. Canary and production builds do not contain the emulator code. In those builds a stored emulator choice acts as HID.

Each place that offers or opens the emulator checks `process.env.BUILD_TYPE === "dev"` itself. Do not move the check into a shared constant: the bundler then keeps `SpeculosHttpTransport` in release bundles. To confirm, build with `BUILD_TYPE=production` and search the output, `.map` files aside, for `currentscreenonly`.

1. Start the emulator with the app for the account type (see [Device apps](#device-apps)). It runs one app at a time.
2. In the wallet, open **Settings → General → Ledger interface** and choose **Speculos (emulator)**. **Check** tests the connection.
3. Run Connect Ledger or a signing flow as usual. Approve or reject on the device with `pnpm ledger:emulator approve` or `reject`.

The extension page sends each APDU to Speculos's `/apdu` (`SpeculosHttpTransport`, `apps/extension/src/ui/hooks/ledger/speculosTransport.ts`). Speculos allows cross-origin requests, so the manifest needs no host permission. When the emulator is stopped, the wallet shows "Could not connect to the Ledger emulator at http://127.0.0.1:5001. Run pnpm ledger:emulator start." When the wrong app is open, it asks you to open the right one, as with a device.

This route exercises every APDU and every device screen. It does not exercise WebHID or WebUSB: test those on a physical device.

## E2E tests

`playwright/e2e-tests/ledger-emulator.spec.ts` connects account 0 of each device app through the wallet UI and compares it with the address the app gives when asked directly. It also signs a personal message from a test dapp, approves it on the device, and compares the signature with one that the app makes directly.

```sh
pnpm build:extension
pnpm test:e2e:ledger
```

The spec runs only with `E2E_LEDGER_EMULATOR=1`, which `pnpm test:e2e:ledger` sets, so the default e2e run and CI skip it. It skips with the reason when Docker is not running or the app builds are missing. It stops any running emulator before each test, and at the end. Set `E2E_HEADLESS=1` to run the browser without a window.

## Commands

| Command                                          | Effect                                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `fetch-apps`                                     | Download the Ethereum, Polkadot and Solana app builds.                                                                   |
| `start [ethereum\|polkadot\|solana\|<path>.elf]` | Start the emulator (default `ethereum`). Reuses a running emulator with the same app and model, and fails for any other. |
| `stop`                                           | Remove the container. Prints `not running` when there is none.                                                           |
| `status`                                         | Check Docker, the container and the API. Exits non-zero on any `FAIL`.                                                   |
| `screen`                                         | Print the text on the device screen.                                                                                     |
| `press <left\|right\|both>`                      | Press a button, then print the screen. `both` confirms.                                                                  |
| `press-until <regex> [max]`                      | Press right until the screen text matches.                                                                               |
| `approve`                                        | Step through a review to its Sign, Accept or Approve screen and confirm.                                                 |
| `reject`                                         | Step through a review to its Reject screen and confirm.                                                                  |
| `enable-blind-signing`                           | Turn on blind signing in the Ethereum app.                                                                               |
| `apdu <hex>`                                     | Send one APDU. Prints the response hex, status word included.                                                            |
| `eth-address [index]`                            | Print the Ethereum address at `m/44'/60'/0'/0/<index>`.                                                                  |
| `screenshot <file.png>`                          | Save the device screen as a PNG.                                                                                         |

Settings, all optional, read from the environment:

| Variable               | Default                                             | Meaning                                                                                                                                          |
| ---------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `LEDGER_TEST_MNEMONIC` | from `apps/extension/.env`, else the Speculos default | Recovery phrase.                                                                                                                                 |
| `SPECULOS_API_PORT`    | `5001`                                              | Host port of the API, bound to `127.0.0.1`. The extension uses 5001 only.                                                                        |
| `SPECULOS_MODEL`       | `nanox`                                             | `nanox`, `nanosp`, `stax`, `flex` or `apex_p`. Stax, Flex and Apex are touch devices: drive them with `/finger` (see [The REST API](#the-rest-api)). |
| `SPECULOS_IMAGE`       | `ghcr.io/ledgerhq/speculos:latest`                  | Docker image. Pin a tag such as `v0.27.4` for reproducible runs.                                                                                 |
| `SPECULOS_CONTAINER`   | `talisman-speculos`                                 | Container name.                                                                                                                                  |
| `LEDGER_APPS_DIR`      | `~/.cache/talisman/ledger-apps`                     | Where `fetch-apps` stores app builds.                                                                                                            |

## Example: sign a personal message

```sh
pnpm ledger:emulator start
# SIGN_PERSONAL_MESSAGE of "hello" at m/44'/60'/0'/0/0
pnpm ledger:emulator apdu e00800001e058000002c8000003c8000000000000000000000000000000568656c6c6f &
pnpm ledger:emulator approve
```

`apdu` waits until the device answers, so it runs in the background while `approve` walks the review. The Nano X shows `Review message`, the message, then `Sign message`. The response is `v ‖ r ‖ s` followed by the status word `9000`. A rejected request answers `6985`.

## The REST API

The script covers the common calls. The full API is in Speculos's [swagger.yaml](https://github.com/LedgerHQ/speculos/blob/master/speculos/api/swagger.yaml). The useful endpoints:

| Endpoint                                                          | Use                                                                                                                                      |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /apdu` `{"data":"<hex>"}`                                   | Exchange one APDU. The response is `{"data":"<hex>"}` with the status word last.                                                         |
| `POST /button/{left,right,both}` `{"action":"press-and-release"}` | Press a button.                                                                                                                          |
| `POST /finger` `{"action":"press-and-release","x":…,"y":…}`       | Touch the screen (Stax, Flex, Apex).                                                                                                     |
| `GET /events?currentscreenonly=true`                              | Screen text as JSON.                                                                                                                     |
| `GET /screenshot`                                                 | Screen as PNG.                                                                                                                           |
| `POST /automation`                                                | Rules that press buttons when given text appears ([docs](https://speculos.ledger.com/user/automation.html)). Useful for unattended runs. |

Speculos starts the app unlocked. There is no PIN, no onboarding and no dashboard.

## Device apps

Connect Ledger offers three account types. Each is signed by its own device app.

| Account type | Device app       | Start command    | Ready screen            |
| ------------ | ---------------- | ---------------- | ----------------------- |
| Ethereum     | Ethereum         | `start`          | `Ethereum \| app is ready` |
| Substrate    | Polkadot generic | `start polkadot` | `Polkadot \| Ready`        |
| Solana       | Solana           | `start solana`   | `Solana \| app is ready`   |

The Polkadot generic app derives `m/44'/354'/<account>'/0'/<index>'`. Solana offers Ledger Live (`44'/501'/<index>'`) and Classic (`44'/501'/<index>'/0'`) paths. The network-specific Substrate apps (the "Migration App" choice) have no build here.

### CI-built apps

The Ethereum app is a pinned GitHub release. The Polkadot generic app and the Solana app publish no release builds. Their CI uploads emulator builds on every push to the default branch, as GitHub Actions artifacts with one `<model>/bin/app.elf` per device model.

| App      | Repository                                                        | Branch   | Artifacts                                                        |
| -------- | ----------------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| Polkadot | [LedgerHQ/app-polkadot](https://github.com/LedgerHQ/app-polkadot) | `main`   | `compiled_app_binaries`                                          |
| Solana   | [LedgerHQ/app-solana](https://github.com/LedgerHQ/app-solana)     | `master` | `guidelines_enforcer_app_binaries`, else `compiled_app_binaries` |

`fetch-apps` downloads the newest unexpired artifact from a push to the upstream repository's branch, and writes its run id and artifact name to `<app>/ci-build`. It skips runs from forks and from other triggers: never run a fork's build in the emulator, which holds the recovery phrase. Solana's `compiled_app_binaries` is built with `TRUSTED_NAME_TEST_KEY=1`, so `fetch-apps` uses it only when no `guidelines_enforcer_app_binaries` artifact is left.

GitHub deletes the artifacts after 90 days. If `fetch-apps` reports `no unexpired … artifact`, build the app with Ledger's builder image, `ghcr.io/ledgerhq/ledger-app-builder/ledger-app-builder-lite`, as the repository's README describes. Then start the build by path:

```sh
pnpm ledger:emulator start ~/src/app-solana/build/nanox/bin/app.elf
```

The model of a build must match `SPECULOS_MODEL`. Ledger names the Nano S Plus `nanos2` in build paths, and Speculos calls it `nanosp`.
