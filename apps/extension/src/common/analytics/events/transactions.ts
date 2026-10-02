import { properties } from "../properties"
import { defineEventGroup } from "../schema"

export const transactionEvents = defineEventGroup(properties, {
  tx_signed: {
    description:
      "The wallet signed a transaction the user approved: with a local key, or a Ledger or Vault signature reached it. sign_only: the dapp broadcasts it. Sent once the background finished the request, so a failed broadcast still follows it with tx_broadcast_failed.",
    props: {
      platform: "required",
      network_id: "required",
      tx_type: "required",
      signer: "required",
      submitted_by: "required",
      sign_only: "required",
    },
  },
  tx_broadcast: {
    description: "The wallet broadcast a transaction and the node accepted it.",
    props: {
      platform: "required",
      network_id: "required",
      tx_type: "required",
      submitted_by: "required",
      signer: "required",
    },
  },
  tx_broadcast_failed: {
    description:
      "The wallet tried to sign and broadcast a transaction and it failed before any node accepted it. Its stored transaction is removed, so no tx_settled follows, unless a transaction with the same nonce settled while this broadcast was still pending (then it also settles as replaced).",
    props: {
      platform: "required",
      network_id: "required",
      tx_type: "required",
      submitted_by: "required",
      signer: "required",
      error_category: "required",
    },
  },
  tx_settled: {
    description:
      "A stored transaction reached its first final status. Dapp transactions settle here too when the wallet watched them. A later correction of the status sends nothing.",
    props: {
      status: "required",
      platform: "required",
      network_id: "required",
      tx_type: "required",
      time_to_settle_ms: "required",
      submitted_by: "required",
      signer: "optional",
    },
  },
})
