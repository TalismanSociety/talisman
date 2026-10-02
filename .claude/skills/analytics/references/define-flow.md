# defineFlow options

```ts
export const send = defineFlow("send", {
  subject: "sending tokens",
  steps: [{ name: "token", screen: "/send/token" }, "confirm"],
  entries: ["dashboard", "token_details"],
  attributes: { platform: "required" },
  extras: { submitted: { signer: "required" } },
  settlement: "transaction",
})
```

| Option | Meaning |
| --- | --- |
| `subject` | "The user started `<subject>`." must read as a sentence. Every generated description uses it |
| `steps` | Funnel order. A bare name sends `_step_viewed`. `{ name, screen }` is a route pattern: `$screen` covers it, so no event is sent, but `last_step` still names it |
| `entries` | The places the flow starts from. `useFlow` then requires `entry` |
| `attributes` | Properties that every event of the attempt repeats. They can change mid-attempt |
| `extras` | Properties beyond the runtime's, per lifecycle: `started`, `submitted`, `completed`, `failed`, `abandoned` |
| `settlement` | `"transaction"`: the worker sends `_completed` with `status` when the submitted transaction settles. The default `"caller"` means the page calls `completed`. The worker can add what it knows about the transaction (`Settled.properties` in `txSettled.ts`): `_completed` keeps only the ones its `extras.completed` declares. A swap waits for its exchange status this way |
| `omit` | `"submitted"` or `"failed"`, for a flow that has none. `_completed` and `_abandoned` always exist |
| `rename` | Mobile's name for a lifecycle event, where mobile already has one |
| `lastStepAlias` | A registry property that `_abandoned` writes the last step under instead of `last_step` (mobile's `stage`) |

A failure does not end the attempt: the user can retry under the same `flow_id`. Each attempt ends with one `_completed` or one `_abandoned`.
