---
name: analytics
description: This skill should be used when a change adds or changes a wizard, a modal with stages, a `pri(...)` message, a `provideContext` provider, an error toast, a route or a `track()` event in the Talisman extension, when asked to "add analytics", "track a flow", "add an event" or "add an exemption", or when a type error or test names `MESSAGE_COVERAGE`, `FLOW_PROVIDERS`, `NotificationProps`, `MOBILE_SHARED` or the analytics catalogue.
---

# Analytics in the Talisman extension

Events, properties and flows are values in `apps/extension/src/common/analytics/`. `track()`, the background parser and PostHog's definitions all read them, so a wrong event is a type error and an event that nothing sends fails a test. Dev builds send nothing: they keep the last 500 events in a log.

## Decide what the change needs

| The change adds or changes | Do this |
| --- | --- |
| A wizard, a modal with stages, or a run of routes | Add a flow |
| One user action outside a flow | Add an event |
| A `pri(...)` message | Add one line to `MESSAGE_COVERAGE` |
| A `provideContext` provider | Add one line to `FLOW_PROVIDERS` |
| An error toast | Pass `cause: err`, or `errorCategory` when nothing was thrown |
| An inline form error from a caught failure | `setError(field, { type: classifyError(err), message })`, and `errorCategory={errorCategoryOfField(errors.field)}` on its `FormFieldContainer` |
| An inline error a hook computes | Return an `InlineError` (`{ message, category }`) where the condition is checked, and `useErrorShown` where it renders |
| A `SignAlertMessage type="error"` | `errorCategory`: the failure it shows, or `null` when it warns about what the request does (an unlimited approval, a domain mismatch), which sends no `error_shown` |
| A caught error that is a bug, not a user mistake | `reportError(err)` from the seam of the file's realm: `@ui/api/errorReporting` in pages, `core/domains/analytics/errorReporting` in the background. A core module that pages import (the password store, notifications) logs instead: `error-reporting-realms.test.ts` fails otherwise |
| A `<Route path>` | Use words, `:param` and `*`, never a value |
| A key in `SettingsStoreData` or `AppStoreData` | Classify it in `common/analytics/settings.ts`: a `setting_changed` key, or the reason it is not one |

Screens, modals, error toasts, transactions and dapp requests are tracked centrally. Do not add events for them.

## Add a flow

1. Create `common/analytics/flow/definitions/<name>.ts` with `defineFlow("<name>", { subject, steps, … })`. Add it to `FLOWS` in `flow/registry.ts`. The options are in `references/define-flow.md`.
2. Add any extra property to `properties.ts`, with a sentence that says what the value means.
3. In the hook that holds the steps, call `useFlow(flows.<name>, { step, entry, attributes, active })`. Pass `active: isOpen` when the provider stays mounted while the modal is closed.
4. Report from event handlers and async code: `flows.<name>.submitted(…)` where the user confirms, `flows.<name>.failed(err)` in the catch that shows the error, and `flows.<name>.completed(…)` where the user finishes. A flow with `settlement: "transaction"` passes `transactionId` to `submitted` and never calls `completed`: the worker sends it when the transaction settles. `TxSubmitButton` and `SapiSendButton` take `onError`, called after their own error toast: pass the reporter itself, `onError={flows.<name>.failed}`. A Bittensor MEV Shield submit calls `onSubmitted(hash, innerHash)`: link `innerHash`, the staking call (`stakingTransactionId`).
5. Classify the flow's messages as `{ flow: "<name>" }` in `MESSAGE_COVERAGE`, and its provider as `{ flow: "<name>" }` in `FLOW_PROVIDERS`.
6. Prove it with `.claude/skills/verify/features/analytics-events.md`.

The runtime adds `flow_id`, `step`, `last_step`, `duration_ms`, `error_category` and `abandon_cause`. It sends `_started`, `_step_viewed` and `_abandoned` by itself. Closing the page mid-flow sends `_abandoned` with `abandon_cause: "page_closed"` from the worker.

Rules that the types do not catch:

- Never report from a child's mount effect. Children's effects run before `useFlow` starts the attempt. A child that knows a step the parent cannot see (a modal, a device prompt) declares it as state to the provider that runs the flow, as `useAddAccountStep` does for `add_account`.
- A step held in state reaches the flow on the next render. When the same handler sets the step and then calls `submitted`, call `flows.<name>.step(…)` first, or `last_step` reads the step before.
- A page runs one attempt per flow. Call `useFlow` once, in the provider or the common parent.
- `completed`, and `submitted` of a transaction flow, mark the modal or drawer on top as completed, so its `modal_closed` reads `dismiss: "completed"`.
- One invalid value rejects the whole event in the background, and a rejected `submitted` never links its transaction. Pass tokens through `tokenSymbolForAnalytics` (`unknown` for a user-added token) and networks through `networkIdForAnalytics` (`custom` for a user-added network), both in `common/analytics/funds.ts`.

## Add an event

1. Add it to a group in `common/analytics/events/` with `defineEventGroup(properties, { name: { description, props } })`. A prop is `"required"`, `"optional"` or `{ narrow: z.enum([...]) }`.
2. Send it with `track("name", { … })`. Write the name as a string literal, or the liveness test cannot see it.
3. Do not write `<flow>_started` or any other flow event by hand. `defineFlow` generates them.
4. If mobile sends an event of the same name, give it mobile's properties, and add a row to `MOBILE_SHARED`.
5. An event that a `pri(...)` message causes in the background goes in a table that `observeExtensionMessage` reads (`CHANGE_OBSERVERS` in `core/domains/analytics/observeMessage.ts`: `accountMessages.ts` for accounts and contacts, `dappMessages.ts` for dapp connections and the networks and tokens dapps add, `chaindataMessages.ts` for the networks and tokens of settings, `nftMessages.ts`), not in the handler: domain code never imports analytics. A dapp request's decision needs a message too: a page that only calls `window.close()` reads `outcome: closed`, never `rejected`.
6. A setting the user changes needs no `track()`: the `useSetting` and `useAppState` setters send `setting_changed` for a classified key whose value changed. A write the user did not make (an effect that clears a stale value) goes through `settingsStore.set` or `appStore.set`, which send nothing.

## Add an exemption

- A message: `{ exempt: "transport" | "navigation" | "housekeeping" }` in `MESSAGE_COVERAGE`. A message that changes user state is never exempt: give it `{ event }` or `{ flow }`. A new reason is an edit of `Coverage` in `common/analytics/coverage.ts`.
- A provider: `{ none: "<what it holds>" }` in `FLOW_PROVIDERS`. The test fails if its hook holds step state.

## When a guard fails

| The message says | Fix |
| --- | --- |
| `Property '"pri(x)"' is missing in type … MessageCoverage` | Add the message to `core/domains/analytics/messageCoverage.ts` |
| `Property 'x' is missing in type …` at `common/analytics/settings.ts` | Classify the new setting or app flag there |
| `Type '"x"' is not assignable to type 'EventName …'` | Add the event to the catalogue first |
| `Provider "X" (…) is not classified` | Add it to `FLOW_PROVIDERS` in `src/__tests__/analyticsFlowProviders.ts` |
| `Provider "X" is { none } but its hook … holds step state` | Make it a flow, or move the step state out |
| `… does not call useFlow(flows.x, …)` | Call `useFlow` in the file the message names |
| `… holds step state … outside a provider` | List the file in `STEP_STATE_ELSEWHERE` |
| `Event "x" has no emitter` | Send it with `track("x", …)`, or delete it |
| `Flow "x" is never started` | Call `useFlow(flows.x, …)` |
| `Flow "x" can never complete` | Add the `completed` call, or `submitted` with `transactionId` for a transaction flow |
| `Flow "x" defines events nothing sends` | Add the call it names, or list the event in the flow's `omit` |
| `track() needs a string literal event name` | Write the event name as a literal |
| `Write a sentence for: x` | Give the event or property a description that ends with a full stop |
| `No event carries: x` | Use the property in an event, or delete it |
| `x is shared with mobile and lacks …` | Add mobile's properties to the event or the flow's extras |
| `Duplicate analytics event: x` (type error) | A flow generates that name. Rename the domain event, or use the flow's `rename` |
| `… is not assignable to parameter of type 'NotificationProps'` | Add `cause: err` to the error toast, or `errorCategory` when nothing was thrown |
| `imports toast from react-toastify` or `calls notifyCustom` | Use `notify` or `notifyUpdate` from `@ui/components/Notifications` |
| `<Route path=…>: "…" looks like a value` | Use a `:param` segment and read it with `useParams()` |
| `${x} is not a constant` | Use a `:param` segment, or splice a constant |
