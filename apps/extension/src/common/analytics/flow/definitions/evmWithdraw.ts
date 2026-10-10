import { defineFlow } from "../defineFlow"

export const evmWithdraw = defineFlow("evm_withdraw", {
  subject: "withdrawing an EVM mirror balance to its substrate account",
  steps: ["amount", "confirm"],
  extras: {
    submitted: {
      network_id: "required",
      symbol: "required",
      signer: "required",
      usd_bucket: "required",
    },
  },
  settlement: "transaction",
})
