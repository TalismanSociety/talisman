import type { EventName } from "./catalogue"
import type { FlowName } from "./flow/registry"

type PermanentExemption = "transport" | "navigation" | "housekeeping"

export type Coverage =
  | { readonly event: EventName | readonly [EventName, ...EventName[]] }
  | { readonly flow: FlowName }
  | "read"
  | { readonly exempt: PermanentExemption }
