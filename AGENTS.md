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
- Error messages: `getErrorMessage(err, fallback?)` from `@talismn/util`, never `(err as Error).message`.
- Forms: `@tanstack/react-form` with `zod`. react-hook-form and yup are legacy: do not add them to new code.
- Spelling: Australian English (authorise, colour, initialise, favourite) in names, comments, docs and new UI text. External names keep their source spelling: CSS `color`, HTTP `Authorization`, EIP-1193 `Unauthorized`, viem `authorizationList`. US-spelled names like `AuthorizedSite` are legacy.
- UI text: `t("Plain English sentence")`. The English text is the translation key. `public/locales/` is downloaded from SimpleLocalize by `pnpm chore:download-translations`, so change the English source string only.
- Generated code (`*.gen.ts`, not linted or formatted): change the generator input, then regenerate.
  - OpenAPI clients `Sn45Api.gen.ts`, `TaoDataApi.gen.ts`, `RemoteConfigApi.gen.ts`: `pnpm chore:generate-clients`.
  - `stealthex.api.gen.ts`: `pnpm --filter extension chore:codegen:stealthex-swaps`.
  - Bundled init data (chaindata, remote config): `pnpm chore:generate-init-data`.
- Guard tests in `apps/extension/src/__tests__/` enforce repo-wide rules. When one fails, read that test: its header explains the rule.
- Commit messages: gitmoji plus a short label, e.g. `🐛 fail fast on rate-limited rpc validation`.
- Manual QA: when a change needs checks that unit and E2E tests do not cover (UI, browser-only flows), add a `## Manual QA` section to the PR description: a todo list, one `- [ ]` item per check. Leave out the checks you already ran yourself, for example in the dev browser (see "Verify in the browser"), and say in the PR description what you verified.
- Scratch files go in `.tmp/` (gitignored).

## Analytics

Product analytics go to PostHog. Events, properties and flows are defined once, as values, in `apps/extension/src/common/analytics/`. Read `.claude/skills/analytics/SKILL.md` before you add a flow, an event or an exemption.

- Properties are typed: buckets, enums and slugs. An address, a URL, a hostname, an amount, an error text, or how many accounts or assets the wallet holds (ranges only) has no property to go in.
- No event carries an id of the wallet or the install. A usage event's id is its session, an error report and the daily `tvl_snapshot` each have an id of their own. Never add a stable id, and never the Gandalf install id: `src/__tests__/analytics-keeps-to-itself.test.ts` guards it.
- `track("event_name", props)` takes its event and props from the catalogue. A misspelt event or a missing prop is a type error.
- Error reports go to PostHog as `$exception`, with the error's class, its category and code positions, never its message. Global handlers report uncaught errors. Report a caught error that is a bug with `reportError(err)` from the seam of the file's realm: `@ui/api/errorReporting` in pages, `core/domains/analytics/errorReporting` in the background.
- A task with steps (a wizard, a modal with stages, a run of routes) is a flow. Define it with `defineFlow`, run it with `useFlow(flows.<name>, …)` in the hook that holds the steps, and report `flows.<name>.submitted`, `.completed` and `.failed` where those happen.
- CI fails when a change ships without analytics:
  - a `pri(…)` message missing from `core/domains/analytics/messageCoverage.ts` (type error);
  - a `provideContext` missing from `src/__tests__/analyticsFlowProviders.ts`, or one marked `{ none }` that holds step state;
  - a catalogue event that nothing sends, a flow that cannot end, or an event or property without a description;
  - an error toast without `cause` or `errorCategory` (type error);
  - a setting or app flag missing from `common/analytics/settings.ts` (type error);
  - a `<Route path>` that holds a value instead of words, `:param` and `*`.
- Only production and canary Chrome builds send. Dev builds keep the last 500 events in a log, and every other build (a plain `pnpm build`, CI, the e2e suite) drops them. The Firefox build sends nothing either, and its build fails if it contains the PostHog destination. Prove that your events fire with `.claude/skills/verify/features/analytics-events.md`.

## Dev build

`pnpm dev` builds `apps/extension/dist/chrome-mv3-dev` and opens Chrome with a persistent profile in `~/.talisman-dev/chrome-data`. `NOBROWSER=1 pnpm dev` builds without opening a browser.

- Env: `apps/extension/.env`, template `apps/extension/.env.sample`. A dev build needs no variables. `PASSWORD` unlocks the wallet, and `BITTENSOR_DEVNET_RPC` adds a local subtensor node.
- The dev Chrome has CDP (remote debugging) on port 9223. See "Verify in the browser".
- The dev server uses port 8254. `pnpm dev:kill` stops it.
- `pnpm dev` stops when stdin closes. From a non-interactive shell, run `tail -f /dev/null | pnpm dev`. `pnpm dev:kill` does not stop that `tail`: it never writes, so it never gets SIGPIPE. When you are done, run `pnpm dev:kill && pkill -f "tail -f /dev/null"`.
- Blank page after a dev server restart: reload the extension (`chrome://extensions`, or `chrome.runtime.reload()` in the service worker). If it stays blank, run `rm -rf apps/extension/node_modules/.vite` and restart `pnpm dev`.
- Extension pages show "akcdepjilgckjbngkhjghfnmnnkdnmno is blocked": Developer mode is off in the dev profile. Turn it on in `chrome://extensions`, then restart `pnpm dev`.
- Do not commit while `pnpm dev` runs. The port names contain the git sha (`PORT_SUFFIX` in `apps/extension/src/common/constants.ts`), so the background rejects the pages and content scripts: pages stay blank with no error in their console, and dapp requests hang with no popup. Only the service worker console shows "Unknown connection from ...". Run `pnpm dev:kill && pnpm dev`, then reload the extension.
- A change to the service worker banner in `wxt.config.ts` needs a `pnpm dev` restart.

## Verify in the browser

To verify a change or reproduce a bug in the running wallet, follow the `verify` skill in `.claude/skills/verify/SKILL.md`: a doctor check, helper scripts, and one recipe per feature.

CDP on port 9223 exists only while `pnpm dev` runs with its browser. Always pass the port: most tools default to 9222, which can be another browser. The dev extension id is `akcdepjilgckjbngkhjghfnmnnkdnmno`.

The host dev Chrome serves the main checkout, and the examples below drive it: run them from the main checkout only. A git worktree must not run `pnpm dev`. It drives a browser of its own through the `verify` skill helpers, which refuse to drive 9223 from a worktree.

Extension pages: use agent-browser, a browser automation CLI that comes with an agent skill. Install both once with `npm install -g agent-browser` (or `brew install agent-browser`) and `npx skills add vercel-labs/agent-browser`. The skill tells the agent to run `agent-browser skills get core`, which prints the usage guide for the installed version. You do not need `agent-browser install`: it downloads a Chrome, and here the tool attaches to the dev Chrome.

Open each page in a new tab, because an existing tab cannot navigate to `chrome-extension://`.

```sh
agent-browser --session talisman --cdp 9223 tab new "chrome-extension://akcdepjilgckjbngkhjghfnmnnkdnmno/dashboard.html#/portfolio"
agent-browser --session talisman --cdp 9223 snapshot -i
```

The first extension page after `pnpm dev` starts takes 10 seconds or more to render. Later loads are fast. Before the first snapshot, wait for text you expect: `agent-browser --session talisman --cdp 9223 wait --text "…"`.

Sign popups: agent-browser does not list the popup the extension opens, but the request also renders in a tab it opens itself. Find the popup URL (`popup.html#/…`) with `curl -s localhost:9223/json/list` (it can take a few seconds to appear while the service worker starts), open it with `tab new "<url>"`, then snapshot and click there. Approving or rejecting in either tab completes the request and closes both.

The service worker: agent-browser cannot reach it, so use Playwright. Put the script in `.tmp/` and run it with `node` from the repo root. `browser.close()` disconnects and leaves Chrome running.

```js
import { chromium } from "@playwright/test"

const EXTENSION = "chrome-extension://akcdepjilgckjbngkhjghfnmnnkdnmno"
const browser = await chromium.connectOverCDP("http://localhost:9223")
const background = browser
  .contexts()[0]
  .serviceWorkers()
  .find((worker) => worker.url().startsWith(EXTENSION))
console.log(await background?.evaluate(() => chrome.runtime.getManifest().version_name))

await browser.close()
```

- The service worker is listed only while it runs. Open an extension page to wake it.
