---
name: verify
description: Drive the Talisman wallet extension in the dev Chrome (CDP 9223), or in a git worktree's own browser, the way a user does and capture proof. Use to verify a UI or background change, reproduce a bug in the running wallet, test a dapp request (connect, sign, send), or run manual QA before a PR.
---

# Verify the Talisman extension

The user surface is the browser extension: the dashboard (`dashboard.html`), the popup (`popup.html`), and the dapp providers it injects into web pages. Every `packages/*` library reaches users through it, so verify package changes here too.

The host dev build has one instance per machine: the dev server has a fixed port (8254), the dev Chrome has a fixed CDP port (9223) and a fixed profile (`~/.talisman-dev/chrome-data`). Drive the instance that is running, or start the only one. A second instance collides with the first.

`AGENTS.md` → "Dev build" and "Verify in the browser" is the base reference. This skill adds the run discipline, the helpers, and the feature map in [`features/README.md`](features/README.md).

## 1. Launch

Run every command from the repo root.

Each checkout drives the browser that serves its own build. The helpers find its CDP port in this order: `VERIFY_CDP_PORT`, then the port in `.tmp/verify/cdp-port`, then 9223 in the main checkout. In a worktree they exit with an error when they find no port or find 9223, because 9223 is the main checkout's browser. A shell variable does not last from one agent tool call to the next, so a worktree keeps its port in the file.

### In the main checkout

The main checkout drives the host dev Chrome on CDP 9223.

1. Run the doctor (step 2). When every line is `PASS`, reuse the instance and write `reused: not started by this run` in `$RUN/notes.md`. Go to step 3.
2. When nothing listens on 8254, start the dev build:

   ```sh
   nohup sh -c 'tail -f /dev/null | pnpm dev' > "$RUN/dev.log" 2>&1 &
   echo $! > "$RUN/dev.pid"; sleep 1; pgrep -P "$(cat "$RUN/dev.pid")" > "$RUN/dev.pids"
   ```

   Ready: `$RUN/dev.log` shows `Opened browser in …`, and `curl -s localhost:9223/json/version` answers. The first extension page after a start takes 10 to 40 seconds to render.
3. When the doctor fails on an instance you did not start, fix it with the matching Gotcha below, then run the doctor again.

Keep commits out of the run: a commit while `pnpm dev` runs changes the build sha, and the background rejects every page (see `AGENTS.md`).

### In a worktree

A worktree must not start `pnpm dev`: the host instance belongs to the main checkout. A worktree drives a browser of its own, which serves the worktree's build on another CDP port. Without such a browser, verify a worktree with unit tests and typecheck.

Some machines have a local Docker runner in the main checkout at `.claude/skills/verify/docker/`. It is kept out of git. It gives each worktree a container with its own dev build, Chromium and dev wallet. Set `runner` again in each tool call:

```sh
runner="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")/.claude/skills/verify/docker/worktree.sh"
[ -x "$runner" ] || echo "no Docker runner on this machine: verify with unit tests and typecheck"
```

1. `"$runner" ls`. When it lists the container of this worktree, the run reuses it: write `reused: not started by this run` in `$RUN/notes.md`.
2. `"$runner" up` starts the container, or reuses it, and returns once the container's own doctor passes.
3. `mkdir -p .tmp/verify && "$runner" port > .tmp/verify/cdp-port`
4. Run the doctor (step 2), then go to step 3.

After each edit, run `"$runner" sync`, then the doctor. A rebuild of the background locks the wallet, and the doctor unlocks it. `sync` restarts the build when HEAD changed, so a commit during the run needs only a `sync`. The doctor compares commits: it does not see an edit that you did not sync.

## 2. Doctor

```sh
.claude/skills/verify/bin/doctor.mjs
```

Read-only apart from one dashboard tab that it opens and closes. It prints one `PASS`/`FAIL` line per check and exits non-zero on any `FAIL`:

- on CDP 9223: port 8254 belongs to `wxt` from this checkout
- CDP answers on the port from step 1
- the extension service worker runs the build of HEAD. The line shows three shas: `built` (the manifest on disk), `running` (the script that the service worker runs) and `HEAD`, then the fix:
  - a build older than HEAD: restart the build (`pnpm dev:kill && pnpm dev`, or `"$runner" sync`).
  - a running script older than the build: Chromium runs a cached background script. Reload the extension in `chrome://extensions`, or restart the browser. A runner container wipes that cache at each start: `"$runner" down`, then `up`.
- the dashboard renders (non-empty `#root`), and prints the dev-server modules that failed to load when it does not
- the wallet is onboarded and unlocked. A locked wallet makes the dashboard tab open the login popup, which stays open.

Run it first, and again whenever a page looks wrong.

## 3. Drive

Pick the feature file in [`features/`](features/README.md). Each recipe lists its preconditions, entry points, handles and end state.

Set up the run:

```sh
RUN=.tmp/verify/$(date +%Y%m%d-%H%M%S)-<feature>
.claude/skills/verify/bin/tabs.sh baseline "$RUN"
ab() { .claude/skills/verify/bin/ab "$@"; }
```

`bin/ab` runs agent-browser on the browser from step 1, with session `talisman` on 9223 and `talisman-<port>` on another port. A function does not last between agent tool calls either: when `ab` is not found, define it again or call `bin/ab`.

- **Extension pages:** `ab tab new "chrome-extension://akcdepjilgckjbngkhjghfnmnnkdnmno/dashboard.html#/<route>"`, then `ab wait --text "<text you expect>"` before the first snapshot. Open each page in a new tab: a tab cannot navigate to `chrome-extension://`.
- **Handles**, in order of preference: `ab find testid <id>`, `ab find role button --name "<name>"`, `ab find placeholder "<text>"`, then `@eN` refs from `ab snapshot -i -c`. The `data-testid` values in `playwright/e2e-tests/fixtures.ts` are stable handles.
- **Popups** (connect, sign, send requests from a dapp): `.claude/skills/verify/bin/popup-url.sh` prints the popup URL. Open it with `ab tab new "<url>"` and act there. Approve or reject there completes the request and closes both tabs.
- **Background state:** `.claude/skills/verify/bin/sw-eval.mjs '<async expression>'` evaluates in the service worker and prints JSON. Use it to prove side effects, for example `chrome.storage.local.get("keyring")` for accounts, `chrome.storage.local.get("sitesAuthorized")` for dapp connections.
- **Headless UI modals and anything agent-browser cannot see:** a Playwright script in `.tmp/` that imports `cdpPort` from `../.claude/skills/verify/bin/cdp-port.mjs` and calls ``chromium.connectOverCDP(`http://localhost:${cdpPort()}`)`` (example in `AGENTS.md`). `browser.close()` only disconnects.

Signing: sign only with a test account, whose name starts with `Guardians` (setup in [`features/README.md`](features/README.md#test-accounts)). Read the signer name in the popup before you click Approve or Sign. Runs from several worktrees share these accounts: two sends from one account on one network at the same time take the same nonce, and one fails. The setup funds one sender (`Guardians SUB`), so send from one run at a time.

## 4. Evidence

Everything goes in `$RUN` (under `.tmp/`, gitignored). Cleanup keeps it.

- Screenshots: `ab screenshot "$PWD/$RUN/<nn>-<step>.png"`. Give an absolute path: agent-browser writes a relative path to its own temp folder.
- For each step, capture the user action and the resulting state: the filled form before submit, and the screen after.
- Prove the side effect from a second view: `sw-eval.mjs` output saved as `$RUN/<nn>-<what>.json`, or the same data read in a different page (Settings, Activity).
- A mutation proof includes its undo: remove what the run added, and capture that state too.
- Write `$RUN/notes.md`: feature id, entry point used, instance reused or started, and each entry point you skipped with the reason. A skipped entry point stays unverified: do not report it as verified through another path.

## 5. Cleanup

```sh
.claude/skills/verify/bin/tabs.sh cleanup "$RUN"   # closes the page targets opened since the baseline
```

`tabs.sh cleanup` acts on the browser that `tabs.sh baseline` recorded in `$RUN/cdp-port`. It also closes a tab that a person opened in that browser during the run.

- Undo the wallet mutations of the run (accounts, connected sites, custom networks) through the UI, as each feature file says.
- If this run started the dev build: `kill $(cat "$RUN/dev.pids") "$(cat "$RUN/dev.pid")"; pnpm dev:kill`. `pnpm dev:kill` alone leaves the `tail` alive.
- If this run started the worktree container: `ab close`, then `"$runner" down`, then `rm .tmp/verify/cdp-port`. The `ab close` ends the agent-browser session of that port, which the next container can get.
- If the instance was reused, leave it running: it belongs to someone else.
- Leave `$RUN` in place and name it in your report.

On the host, `ab close` is not a cleanup step: the browser belongs to `pnpm dev`, not to agent-browser.

## Helpers

All in `.claude/skills/verify/bin/`, run from the repo root. Each finds the CDP port as step 1 says, and exits with an error when it cannot:

| Helper | Invocation | Output |
| --- | --- | --- |
| `doctor.mjs` | `doctor.mjs` | `PASS`/`FAIL` per check, exit 1 on any `FAIL` |
| `sw-eval.mjs` | `sw-eval.mjs 'chrome.storage.local.get(null).then(Object.keys)'` | JSON result of the expression in the service worker |
| `popup-url.sh` | `popup-url.sh [seconds]` | the URL of each open `popup.html#/…` target, waits up to 20 s by default |
| `tabs.sh` | `tabs.sh baseline "$RUN"` / `tabs.sh cleanup "$RUN"` | records, then closes, page targets |
| `ab` | `ab <agent-browser command>` | agent-browser on this checkout's browser |
| `cdp-port.mjs` | `cdp-port.mjs`, or `import { cdpPort }` | the CDP port of this checkout's browser |

## Gotchas

- **Blank page, doctor says "dashboard renders: FAIL" with a 404 on `localhost:8254/src/...?t=…`**: the dev server holds a module graph from before a file rename (a pull or checkout while it ran). `touch` the files that import the missing module; if it stays blank, restart `pnpm dev` (only if you started it) or ask the user.
- **Blank page with no 404, or a dapp request with no popup**: the running service worker is from an older build. See `AGENTS.md` → "Dev build" (reload the extension).
- **`wait --text` is case-sensitive**; Playwright `getByText` is not. Copy the text from `ab snapshot` or `ab eval 'document.body.innerText'`.
- **A route change renders async**: after a click that navigates, `ab wait --text` for the new heading before `find`.
- **`agent-browser console` is not tab-scoped**: its buffer holds messages from earlier pages. To attribute a console message, listen with Playwright on the page you opened.
- **Unlock**: use the password field only. Quick Unlock opens a native Touch ID prompt on the user's machine.
