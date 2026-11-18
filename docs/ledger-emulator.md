# Ledger emulator (Speculos)

You can develop and test Ledger flows without a physical device. [Speculos](https://github.com/LedgerHQ/speculos) is Ledger's own emulator. It runs the real device apps (Ethereum, Polkadot, Solana) and serves the device over HTTP. `scripts/ledger-emulator.sh` (`pnpm ledger:emulator`) runs it in Docker and drives it: start, read the screen, press buttons, approve, send APDUs.

Dev builds of the extension can connect to it in place of a USB or HID Ledger. Use it to run Connect Ledger and the signing flows, to see what a Ledger app shows and returns for a payload, and to produce reference addresses and signatures.

## Prerequisites

- **Docker**, running. The script pins the image `ghcr.io/ledgerhq/speculos` by digest. The digest names a multi-platform image, for amd64 and arm64.
- **`git`**, to fetch the source of the Polkadot and Solana apps, which `fetch-apps` builds in Docker.
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

3. Get the app builds:

   ```sh
   pnpm ledger:emulator fetch-apps
   ```

   They go to `~/.cache/talisman/ledger-apps/`, one `.elf` for the device model in `SPECULOS_MODEL`:
   - `ethereum-<version>/`: the Ethereum app release pinned in the script ([app-ethereum releases](https://github.com/LedgerHQ/app-ethereum/releases)).
   - `polkadot-<commit>/`: the Polkadot generic app, built from the commit of [LedgerHQ/app-polkadot](https://github.com/LedgerHQ/app-polkadot) pinned in the script.
   - `solana-<commit>/`: the Solana app, built from the commit of [LedgerHQ/app-solana](https://github.com/LedgerHQ/app-solana) pinned in the script.

   The first run pulls Ledger's builder image (4 GB) and builds the two apps, which takes a few seconds once the image is there. Later runs skip what is already built. See [App builds](#app-builds).

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

   The setting lasts until the container stops, or until `disable-blind-signing`. EIP-712 typed data needs it too, unless the Ethereum app knows the contract. While the setting is off, the device answers such a request with a `Blind signing must be enabled in settings` warning, which stays until a button is pressed. With it on, the review starts with a `Blind signing ahead` warning that both buttons accept: `approve` does that.

## Connect the extension

The emulator is a choice of the Ledger interface setting, next to HID and USB. Dev builds have it: `pnpm dev`, and `pnpm build:extension`, which the e2e tests load. Canary and production builds do not contain the emulator code. In those builds a stored emulator choice acts as HID.

Each place that offers or opens the emulator checks `process.env.BUILD_TYPE === "dev"` itself. Do not move the check into a shared constant: the bundler then keeps `SpeculosHttpTransport` in release bundles. To confirm, build with `BUILD_TYPE=production` and search the output, `.map` files aside, for `currentscreenonly`.

1. Start the emulator with the app for the account type (see [Device apps](#device-apps)). It runs one app at a time.
2. In the wallet, open **Settings → General → Ledger interface** and choose **Speculos (emulator)**. **Check** tests the connection.
3. Run Connect Ledger or a signing flow as usual. Approve or reject on the device with `pnpm ledger:emulator approve` or `reject`.

The extension page sends each APDU to Speculos's `/apdu` (`SpeculosHttpTransport`, `apps/extension/src/ui/hooks/ledger/speculosTransport.ts`). Speculos allows cross-origin requests, so the manifest needs no host permission. When the emulator is stopped, the wallet shows "Could not connect to the Ledger emulator at http://127.0.0.1:5001. Run pnpm ledger:emulator start." When the wrong app is open, it asks you to open the right one, as with a device.

This route exercises every APDU and every device screen. It does not exercise WebHID or WebUSB: test those on a physical device.

## E2E tests

`playwright/e2e-tests/ledger/` has one spec per device app. Each spec is a table of cases, which `suite.ts` turns into tests that drive the wallet UI: connect account 0, send a request from a test dapp, click "Sign on Ledger", approve on the device.

| Device app | Signing cases                                                                         | Error cases                                                                        |
| ---------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Ethereum   | personal message, legacy transaction, EIP-1559 transaction, EIP-712 typed data        | rejected on the device, blind signing disabled, wrong app open, emulator stopped   |
| Polkadot   | extrinsic (`signPayload`), raw message (`signRaw`)                                    | rejected on the device, wrong app open, emulator stopped                           |
| Solana     | transaction, message                                                                  | rejected on the device, wrong app open, emulator stopped                           |

A signing case verifies its result against the account's address or public key, with a crypto library: it recovers the signer of the Ethereum signature or of the mined transaction, and checks the ed25519 signature of the others over the bytes that the chain or a verifier checks. An error case asserts the error the wallet shows, then recovers and checks that the retry signs.

```sh
pnpm ledger:emulator fetch-apps
pnpm build:extension
pnpm test:e2e:ledger
```

The specs run only with `E2E_LEDGER_EMULATOR=1`, which `pnpm test:e2e:ledger` sets, so the default e2e run skips them. `pnpm test:e2e:ledger` also sets one worker: Speculos runs one app on one port. Outside CI the specs skip with the reason when Docker is not running or the app builds are missing. They stop any running emulator at the end, and after a failed test. Set `E2E_HEADLESS=1` to run the browser without a window.

What the specs need at run time:

- **Docker**, for Speculos and for Anvil. The Ethereum spec starts Anvil itself (`ghcr.io/foundry-rs/foundry`, container `talisman-ledger-anvil`, port 8546, chain id 31337) and adds it to the wallet from the dapp. It is a chain of its own because chaindata fixes the fee type of Ethereum mainnet: on a chain without a fee type the wallet sends a legacy transaction when the base fee is zero and an EIP-1559 transaction otherwise, so the spec sets the base fee to get each type.
- **The live Polkadot network**, for the extrinsic case. The Polkadot app decodes a transaction with a proof of the runtime metadata, so the wallet downloads the metadata, and the test reads the runtime version and the metadata to rebuild the signed bytes.
- **The live Solana network**, for the transaction case. The wallet lets the user sign only while the transaction's blockhash is valid, so the test asks for a recent one.

The tests reach both networks over HTTP through the RPCs that the wallet ships with (`initChaindata.json`). No other case needs a network.

The specs read the device directly only while the wallet does not talk to it. Speculos has one APDU channel, and two clients at once get each other's answers.

### In CI

`.github/workflows/ledger-e2e.yml` runs `pnpm test:e2e:ledger` with `E2E_HEADLESS=1`: on pull requests from this repository that change Ledger code, the script, the specs or the workflow, every night, and on demand. It is not a required check. It caches `~/.cache/talisman/ledger-apps`, keyed on `pnpm ledger:emulator apps-key`, so the builder image is pulled only when a pin changes. It uses the public Speculos recovery phrase, so it has no mnemonic secret.

## Commands

| Command                                          | Effect                                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `fetch-apps`                                     | Download the pinned Ethereum app release, and build the Polkadot and Solana apps from their pinned commits.              |
| `apps-key`                                       | Print the pins of the app builds, one per line. CI hashes them into the key of its cache of the builds.                   |
| `start [ethereum\|polkadot\|solana\|<path>.elf]` | Start the emulator (default `ethereum`). Reuses a running emulator with the same app and model, and fails for any other. |
| `stop`                                           | Remove the container. Prints `not running` when there is none.                                                           |
| `status`                                         | Check Docker, the container and the API. Exits non-zero on any `FAIL`.                                                   |
| `screen`                                         | Print the text on the device screen.                                                                                     |
| `press <left\|right\|both>`                      | Press a button, then print the screen. `both` confirms.                                                                  |
| `press-until <regex> [max]`                      | Press right until the screen text matches.                                                                               |
| `approve`                                        | Step through a review to its Sign, Accept or Approve screen and confirm. Accepts the blind signing warning first.        |
| `reject`                                         | Step through a review to its Reject screen and confirm.                                                                  |
| `enable-blind-signing`                           | Turn on blind signing in the Ethereum app.                                                                               |
| `disable-blind-signing`                          | Turn it off again.                                                                                                       |
| `apdu <hex>`                                     | Send one APDU. Prints the response hex, status word included.                                                            |
| `eth-address [index]`                            | Print the Ethereum address at `m/44'/60'/0'/0/<index>`.                                                                  |
| `screenshot <file.png>`                          | Save the device screen as a PNG.                                                                                         |

Settings, all optional, read from the environment:

| Variable               | Default                                             | Meaning                                                                                                                                          |
| ---------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `LEDGER_TEST_MNEMONIC` | from `apps/extension/.env`, else the Speculos default | Recovery phrase.                                                                                                                                 |
| `SPECULOS_API_PORT`    | `5001`                                              | Host port of the API, bound to `127.0.0.1`. The extension uses 5001 only.                                                                        |
| `SPECULOS_MODEL`       | `nanox`                                             | `nanox`, `nanosp`, `stax`, `flex` or `apex_p`. Stax, Flex and Apex are touch devices: drive them with `/finger` (see [The REST API](#the-rest-api)). |
| `SPECULOS_IMAGE`       | `ghcr.io/ledgerhq/speculos@sha256:56c7ec84…`        | Docker image of the emulator, pinned by digest in the script.                                                                                    |
| `LEDGER_APP_BUILDER_IMAGE` | `ghcr.io/ledgerhq/ledger-app-builder/ledger-app-builder-lite@sha256:45ec491f…` | Docker image that `fetch-apps` builds the Polkadot and Solana apps in, pinned by digest in the script.                |
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

### App builds

The emulator and the device apps are pinned at the top of `scripts/ledger-emulator.sh`: the Speculos image and the builder image by digest, the Ethereum app by release version, the Polkadot and Solana apps by commit. A developer and CI get the same files from `fetch-apps`.

The Ethereum app is a GitHub release. The Polkadot generic app and the Solana app publish no release builds. Their CI uploads emulator builds as GitHub Actions artifacts, which GitHub deletes after 90 days, so a pinned artifact stops working. `fetch-apps` therefore fetches each repository at the pinned commit and runs `make` in Ledger's builder image, `ghcr.io/ledgerhq/ledger-app-builder/ledger-app-builder-lite`. With the image pinned, the build of a commit gives the same `.elf` every time.

To move to a newer app, change its pin in the script and run `fetch-apps`, then `pnpm test:e2e:ledger`. Take commits from the default branch of the upstream repository only: the emulator holds the recovery phrase, so never build a fork.

To try another build, start it by path:

```sh
pnpm ledger:emulator start ~/src/app-solana/build/nanox/bin/app.elf
```

The model of a build must match `SPECULOS_MODEL`. Ledger names the Nano S Plus `nanos2` in build paths, and Speculos calls it `nanosp`.
