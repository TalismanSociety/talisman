# AGENTS.md

Talisman wallet monorepo (pnpm). `apps/extension` is the browser extension (WXT + React). `packages/*` are the `@talismn/*` libraries, published to npm.

## Read first

- `apps/extension/ARCHITECTURE.md`: layers, IPC, and where code goes. Read it before you add, move or import across `core/`, `ui/`, `common/` or `inject/`.
- `CONTEXT.md`: glossary. Read it when a domain term is ambiguous (network or chain, token or asset, planck, earn or staking).
- `packages/<name>/README.md`: what each library does.

## Checks

CI runs these on every PR. Run `pnpm verify` before you push. It runs all of them in CI order; Biome checks only the files your commits change since `origin/dev`.

- Lint and format: `pnpm biome check --error-on-warnings --changed --since=origin/dev --no-errors-on-unmatched`. CI checks changed files only and fails on warnings; `pnpm check` does not. `pnpm check:fix` applies fixes.
- Types: `pnpm typecheck`.
- Unit tests: `pnpm test [path]`, from the repo root. For a fast loop, `pnpm vitest related --run <files>` runs only the tests that import `<files>`.
- Unused code and dependencies: `pnpm knip`. Dependencies are hoisted, so an import of a package that is missing from its workspace's `package.json` works locally. Knip fails CI on it. To keep an unused export on purpose, tag it `/** @knipignore <reason> */`. Add to `ignoreIssues` in `knip.ts` only for generated or spec-defined files.
- Licenses: `pnpm check:licenses`. It checks all production dependencies, transitive ones included, and the direct devDependencies.

CI also runs these. `pnpm verify` does not:

- Changesets: CI fails when a changed package has no changeset. `pnpm changeset status --since=origin/dev` shows the release plan. It fails only when packages changed and the branch has no changeset at all.
- Extension build: `pnpm build:extension`. Run it after a change to dependencies, `wxt.config.ts` or bundler settings.
- Package build: `pnpm build:packages`, to publish `@pr<N>` snapshot packages. Run it after a change to a package's `package.json` or `tsdown` config.
- E2E (Playwright): only on PRs from this repo, because it needs Anvil and secrets. To run it locally, see "Writing and running tests" in `README.md`.

The pre-commit hook runs `biome check --staged --error-on-warnings`. It only checks: it changes no file. Fix with `pnpm check:fix`, stage the fix, and commit again. Do not use `--no-verify`.

A `biome-ignore` comment must give the reason for this case. "legacy" is not a reason.

## Conventions

- Workspace packages resolve from source (`@talismn/source` export condition, WXT and vitest aliases). Dev, typecheck and tests never need a package build.
- A change to any file under `packages/<name>/` needs a changeset in the same PR, else CI fails. Add `.changeset/<slug>.md` with the package name, the bump level and a one-line summary. `apps/extension` has no changesets.
- Polkadot SDK chains: use `polkadot-api` (papi) with `@talismn/sapi` and `@talismn/scale`. The repo has no `@polkadot/api`. Chain descriptors live in `.papi/`; `pnpm papi` regenerates them.
- Chain scripts: put them in `.tmp/` and run them from the repo root. Use `createClient(getWsProvider(url))` (`polkadot-api`, `polkadot-api/ws`) and `client.getUnsafeApi()`. Give papi codecs `Uint8Array.from(buf)`, never a Node `Buffer`: the codecs ignore `byteOffset`, so a pooled `Buffer` decodes the wrong bytes without an error.
- Dependencies: pnpm settings are in `pnpm-workspace.yaml`. `minimumReleaseAge` rejects versions that are less than 3 days old, `savePrefix: ""` pins exact versions, and `allowBuilds` stops install scripts. Cap each override below the next major (`">=7.26.10 <8.0.0"`). Declare a dependency in the `package.json` of each workspace that imports it.
- Logging in `apps/extension`: `log` from `@common/log`, never `console.*`.
- UI text: `t("Plain English sentence")`. The English text is the translation key. `public/locales/` is downloaded from SimpleLocalize by `pnpm chore:download-translations`, so change the English source string only.
- Generated code (`*.gen.ts`, not linted or formatted): change the generator input, then regenerate.
  - OpenAPI clients `Sn45Api.gen.ts`, `TaoDataApi.gen.ts`, `RemoteConfigApi.gen.ts`: `pnpm chore:generate-clients`.
  - `stealthex.api.gen.ts`: `pnpm --filter extension chore:codegen:stealthex-swaps`.
  - Bundled init data (chaindata, remote config): `pnpm chore:generate-init-data`.
- Guard tests in `apps/extension/src/__tests__/` enforce repo-wide rules. When one fails, read that test: its header explains the rule.
- Commit messages: gitmoji plus a short label, e.g. `🐛 fail fast on rate-limited rpc validation`.
- Scratch files go in `.tmp/` (gitignored).

## Dev build

`pnpm dev` builds `apps/extension/dist/chrome-mv3-dev` and opens Chrome with a persistent profile in `~/.talisman-dev/chrome-data`. `NOBROWSER=1 pnpm dev` builds without opening a browser.

- Env: `apps/extension/.env`, template `apps/extension/.env.sample`. A dev build needs no variables. `PASSWORD` unlocks the wallet, and `BITTENSOR_DEVNET_RPC` adds a local subtensor node.
- The dev Chrome has CDP (remote debugging) on port 9223.
- The dev server uses port 8254. `pnpm dev:kill` stops it.
- `pnpm dev` stops when stdin closes. From a non-interactive shell, run `tail -f /dev/null | pnpm dev`.
- Blank page after a dev server restart: reload the extension (`chrome://extensions`, or `chrome.runtime.reload()` in the service worker). If it stays blank, run `rm -rf apps/extension/node_modules/.vite` and restart `pnpm dev`.
- Do not commit while `pnpm dev` runs. The port names contain the git sha (`PORT_SUFFIX` in `apps/extension/src/common/constants.ts`), so the background rejects the pages ("Unknown connection from ..." in the service worker console). Run `pnpm dev:kill && pnpm dev`, then reload the extension.
- A change to the service worker banner in `wxt.config.ts` needs a `pnpm dev` restart.
