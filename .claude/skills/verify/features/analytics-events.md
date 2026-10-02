# Analytics events

A change that adds analytics proves its events here. A dev build never sends events: it records the last 500 in a log, and a run reads that log through the service worker. The recovery phrase backup flow is the worked example.

## Sub-features

- `event-log` reads the log and filters it by event name and capture time.
- `flow-trace` follows one flow attempt by its `flow_id`: `_started`, `_step_viewed`, `_submitted`, then `_completed` or `_abandoned`.
- `page-closed` closes the page mid-flow. The worker sends `_abandoned` with `abandon_cause: "page_closed"` and the `last_step`.
- `left` dismisses the modal mid-flow. The page sends `_abandoned` with `abandon_cause: "left"`, and `modal_closed` reads the gesture.
- `exceptions` throws in the worker and in a page. Each `$exception` reads `queued` with the error class and category and no message text, or `filtered` (ignore list, throttle) or `dropped_consent`.

## How to get to it (user POV)

- Dashboard → Settings → Security & Privacy → the Analytics toggle turns usage events on. Its Learn More link opens `dashboard.html#/settings/analytics`, which has the same toggle first.
- Dashboard → Settings → Analytics event log lists the same log: `dashboard.html#/settings/dev-event-log`. It shows only in dev builds.
- The backup flow: Dashboard → Settings → Recovery Phrases (`dashboard.html#/settings/mnemonics`), a phrase's `…` menu → Backup.

## Driving it with agent-browser

Preconditions:

- The doctor passes and the wallet is unlocked.
- Usage analytics is on. Read it with `sw-eval.mjs 'chrome.storage.local.get("settings").then((s) => s.settings.useAnalyticsTracking)'` and save the value to restore it at the end. To turn it on, open `$EXT/dashboard.html#/settings/analytics` and click the first toggle. With it off, events read `dropped_consent`.
- The phrase you back up is already backed up (no `Backup` badge on its row). Then its checkbox is enabled without revealing the phrase.

Steps:

- **Mark the time.** `T0=$(.claude/skills/verify/bin/sw-eval.mjs 'Date.now()')`. The log has no per-run reset: filter by `capturedAt`.
- **Define the read.**

  ```sh
  trace() { .claude/skills/verify/bin/sw-eval.mjs "globalThis.talismanAnalytics.log().then((log) => log.filter((e) => e.capturedAt > $T0 && /^(recovery_phrase_backup_|modal_|error_shown)/.test(e.name)).map((e) => { const { flow_id, entry, step, last_step, abandon_cause, error_category, verified, dismiss } = e.wire?.properties ?? {}; return { name: e.name, disposition: e.disposition, issues: e.issues, flow_id, entry, step, last_step, abandon_cause, error_category, verified, dismiss } }))"; }
  ```

- **Complete the flow.** `ab tab new "$EXT/dashboard.html#/settings/mnemonics"`, `ab wait --text "Recovery Phrases"`. Open the phrase's `…` menu (`ab find testid mnemonic-context-menu-trigger` lists one per row) and click `ab find testid mnemonics-context-menu-item-backup click`. Click `ab find testid mnemonic-acknowledge-button click`. Fill the password field with the dev wallet password (`PASSWORD` in `apps/extension/.env`) and click `View Recovery Phrase`. Untick and tick `I have backed up my recovery phrase…`, then click `Skip Verification`. Do not click the blurred phrase. `trace` shows `_started` (`entry: settings`), `_step_viewed` for `acknowledgement` and `show`, `_submitted`, `_completed` with `verified: false`, and `modal_closed` with `dismiss: completed`. All flow events share one `flow_id`.
- **Close the page mid-flow.** Mark the time again. Open the backup modal, acknowledge, type a wrong password, and click `View Recovery Phrase`. Close the tab with `ab tab close`. `trace` shows `error_shown` with the attempt's `flow_id`, then `_abandoned` with `abandon_cause: page_closed`, `last_step: show` and that `error_category`. No `modal_closed` follows: a closing page runs no code.
- **Leave with Escape.** Mark the time again. Open the backup modal, acknowledge, and press `ab press Escape`. `trace` shows `modal_closed` with `dismiss: escape`, then `_abandoned` with `abandon_cause: left` and `last_step: show`.
- **Restore.** Turn analytics off again in `$EXT/dashboard.html#/settings/analytics` if it was off.

To trace another flow, change the name filter in `trace` to its events.

### Exceptions

Error reporting is the Error reporting toggle in Security & Privacy (`$EXT/dashboard.html#/settings/security-privacy-settings`). Save its value first and restore it at the end. Mark the time as above, then read the exceptions with `.claude/skills/verify/bin/sw-eval.mjs "globalThis.talismanAnalytics.log().then((log) => log.filter((e) => e.capturedAt > $T0 && e.name === '\$exception'))"`.

- **Worker.** `sw-eval.mjs '(talismanAnalytics.probeException("probe 0xdeadbeef"), 0)'` throws from bundled code, so the worker's own handler reports it. The entry has `ui_context: background`, `mechanism: uncaught`, a `background.js` frame, the type `Error` and the value `unknown` (its category): the message `probe 0xdeadbeef` appears nowhere in the entry. Its `distinct_id` is its own `uuid`, and it has no `$session_id` and no `browser_language`.
- **Page.** In a dashboard tab, `ab eval 'setTimeout(() => { throw new Error("probe") }); 1'`. The entry has `ui_context: dashboard` and the page's `$screen_name`. `Promise.reject(new Error("probe"))` reads `mechanism: unhandled_rejection`. Dev builds serve page code from the dev server, and a frame outside the extension's own scripts is dropped, so a page exception can have no frames in dev.
- **Throttle.** The same message a fourth time within 10 minutes reads `filtered` with `issues: ["throttled"]`. Change the message between runs.
- **Off.** With Error reporting off, each exception reads `dropped_consent`.
- **Error boundary.** No page has a crash trigger. Add a temporary `throw` to a component, open its page, and read `Error ID: <id>` on the crash screen: it equals the `$exception` entry's `id` and `wire.uuid`. With Error reporting off, the crash screen shows no Error ID. Remove the `throw` before you commit.

## Gotchas

- Before consent, events read `held`. They move to `released` on opt-in.
- `issues` on an entry means the background parser rejected the event: the page sent a property the catalogue does not allow.
- The log stores wire properties after redaction. A `<hex>`, `<base58>` or `<mnemonic>` in a property means a value leaked into it: fix the call site.
- The Verify step lays the phrase's words out as choices. Do not open it in a recorded run, and never screenshot a revealed phrase.
- A transaction flow's `_completed` comes from the worker when the transaction settles, which can be after the page closed. Look for it next to `tx_settled`.
- `?showBackupModal` opens the modal only when exactly one phrase is not backed up, and only if the list loaded first. Do not rely on it for the `reminder` entry.
- A temporary edit that throws when the background loads (for example, a duplicate event name to see a guard fail) kills the service worker while `pnpm dev` runs, and it stays down after you undo the edit. Reload the extension from `chrome://extensions`.
