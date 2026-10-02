import { RECEIVE_ENTRIES } from "../../funds"
import { defineFlow } from "../defineFlow"

/** A copy failure is error_shown with the clipboard category, inside the attempt. */
export const receive = defineFlow("receive", {
  subject: "copying an address to receive funds",
  steps: ["account", "chain", "copy"],
  entries: RECEIVE_ENTRIES,
  extras: { completed: { network_id: "required", address_format: "required" } },
  omit: ["submitted", "failed"],
  rename: { started: "receive_opened", completed: "receive_address_copied" },
})
