import { defineFlow } from "../defineFlow"

export const accountProxyAdd = defineFlow("account_proxy_add", {
  subject: "adding a proxy to an account",
  steps: ["form", "confirm"],
  settlement: "transaction",
  omit: ["failed"],
})

export const accountProxyRemove = defineFlow("account_proxy_remove", {
  subject: "removing a proxy from an account",
  steps: ["confirm"],
  settlement: "transaction",
  omit: ["failed"],
})
