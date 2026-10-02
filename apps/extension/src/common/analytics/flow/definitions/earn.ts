import { EARN_ENTRIES } from "../../staking"
import { defineFlow } from "../defineFlow"

const submitted = {
  network_id: "required",
  symbol: "required",
  signer: "required",
  usd_bucket: "required",
  yield_id: "required",
} as const

export const earnDeposit = defineFlow("earn_deposit", {
  subject: "entering a yield.xyz Earn position",
  steps: ["token", "product", "account", "amount", "confirm"],
  entries: EARN_ENTRIES,
  extras: { submitted },
})

export const earnWithdraw = defineFlow("earn_withdraw", {
  subject: "exiting a yield.xyz Earn position",
  steps: ["amount", "confirm"],
  extras: { submitted },
})

export const earnManage = defineFlow("earn_manage", {
  subject: "running a yield.xyz action on an Earn position, such as claiming rewards",
  steps: ["prepare", "confirm"],
  attributes: { earn_action: "required" },
  extras: { submitted },
})
