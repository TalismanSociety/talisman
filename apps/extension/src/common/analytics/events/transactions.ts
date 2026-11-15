import { properties } from "../properties"
import { defineEventGroup, type EventDef, type PropertyValueOf } from "../schema"
import type { SubmittedBy } from "../transactions"

type DappDomain = PropertyValueOf<typeof properties.dapp_domain>

type BySubmitter<P> = Omit<P, "submitted_by" | "dapp_domain"> &
  (
    | { submitted_by: "wallet"; dapp_domain?: never }
    | { submitted_by: "dapp"; dapp_domain: DappDomain }
  )

type SubmittedProps = { submitted_by: SubmittedBy; dapp_domain?: DappDomain }

const domainWhenDappSubmitted = <P extends SubmittedProps>(
  def: EventDef<P>
): EventDef<BySubmitter<P>> => ({
  ...def,
  schema: def.schema.refine(
    (props) => (props.submitted_by === "dapp") === (props.dapp_domain !== undefined),
    { path: ["dapp_domain"], message: "dapp_domain goes with submitted_by dapp, and only with it" }
  ) as unknown as EventDef<BySubmitter<P>>["schema"],
})

const events = defineEventGroup(properties, {
  tx_signed: {
    description:
      "The wallet signed a transaction the user approved: with a local key, or a Ledger or Vault signature reached it. sign_only: the dapp broadcasts it. Sent once the background finished the request, so a failed broadcast still follows it with tx_broadcast_failed.",
    props: {
      platform: "required",
      network_id: "required",
      tx_type: "required",
      signer: "required",
      submitted_by: "required",
      dapp_domain: "optional",
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
      dapp_domain: "optional",
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
      dapp_domain: "optional",
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
      dapp_domain: "optional",
      signer: "optional",
    },
  },
})

export const transactionEvents = {
  tx_signed: domainWhenDappSubmitted(events.tx_signed),
  tx_broadcast: domainWhenDappSubmitted(events.tx_broadcast),
  tx_broadcast_failed: domainWhenDappSubmitted(events.tx_broadcast_failed),
  tx_settled: domainWhenDappSubmitted(events.tx_settled),
}
