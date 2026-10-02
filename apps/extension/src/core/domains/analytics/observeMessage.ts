import { classifyError } from "@common/analytics/errorCategory"
import { txTypeOf } from "@common/analytics/transactions"
import { log } from "@common/log"
import { deserializeTransaction, parseTransactionInfo } from "@talismn/solana"

import { requestStore } from "../../libs/requests/store"
import type { MessageTypes, RequestTypes, ResponseTypes } from "../../types"
import { isJsonPayload } from "../../util/isJsonPayload"
import { observeAccountMessage } from "./accountMessages"
import { observeChaindataMessage } from "./chaindataMessages"
import { observeDappMessage } from "./dappMessages"
import { dappRequestTracker } from "./dappRequests"
import { observeNftMessage } from "./nftMessages"
import { track } from "./track"
import { resolveTxContext, type TxAttempt } from "./txContext"

const reportFailure = (cause: unknown) =>
  log.error("[analytics] message observation failed", { cause })

export type MessageOutcome = { ok: true; response: unknown } | { ok: false; error: unknown }

type SubmissionPolicy<M extends MessageTypes> = {
  readonly read: (request: RequestTypes[M]) => TxAttempt | null
  readonly succeeded: (response: ResponseTypes[M]) => boolean
}

export type TxSubmissionMessage =
  | "pri(eth.signing.signAndSend)"
  | "pri(eth.signing.sendSigned)"
  | "pri(eth.signing.approveSignAndSend)"
  | "pri(eth.signing.approveSignAndSendHardware)"
  | "pri(substrate.rpc.submit)"
  | "pri(substrate.rpc.submit.withBittensorMevShield)"
  | "pri(solana.rpc.submit)"
  | "pri(solana.sign.approve)"
  | "pri(signing.approveSign)"
  | "pri(signing.approveSign.hardware)"
  | "pri(signing.approveSign.qr)"

const always = () => true
const isTrue = (response: boolean) => response === true

const storedEthSend = (id: string): TxAttempt | null => {
  const queued = requestStore.getRequest(id as `eth-send.${string}`)
  if (!queued) return null
  return {
    platform: "ethereum",
    network: { networkId: queued.ethChainId },
    address: queued.account.address,
    txType: "other",
    submittedBy: "dapp",
    signOnly: false,
  }
}

const storedSubstrateSign = (id: string): TxAttempt | null => {
  const queued = requestStore.getRequest(id as `substrate-sign.${string}`)
  if (!queued || !isJsonPayload(queued.request.payload)) return null
  return {
    platform: "polkadot",
    network: { genesisHash: queued.request.payload.genesisHash },
    address: queued.account.address,
    txType: "other",
    submittedBy: "dapp",
    signOnly: true,
  }
}

const TX_SUBMISSION_POLICY = {
  "pri(eth.signing.signAndSend)": {
    read: ({ evmNetworkId, unsigned, txInfo }) =>
      unsigned.from
        ? {
            platform: "ethereum",
            network: { networkId: evmNetworkId },
            address: unsigned.from,
            txType: txTypeOf(txInfo),
            submittedBy: "wallet",
            signOnly: false,
          }
        : null,
    succeeded: always,
  },
  "pri(eth.signing.sendSigned)": {
    read: ({ evmNetworkId, unsigned, txInfo }) =>
      unsigned.from
        ? {
            platform: "ethereum",
            network: { networkId: evmNetworkId },
            address: unsigned.from,
            txType: txTypeOf(txInfo),
            submittedBy: "wallet",
            signOnly: false,
          }
        : null,
    succeeded: always,
  },
  "pri(eth.signing.approveSignAndSend)": {
    read: ({ id }) => storedEthSend(id),
    succeeded: isTrue,
  },
  "pri(eth.signing.approveSignAndSendHardware)": {
    read: ({ id }) => storedEthSend(id),
    succeeded: isTrue,
  },
  "pri(substrate.rpc.submit)": {
    read: ({ payload, txInfo }) => ({
      platform: "polkadot",
      network: { genesisHash: payload.genesisHash },
      address: payload.address,
      txType: txTypeOf(txInfo),
      submittedBy: "wallet",
      signOnly: false,
    }),
    succeeded: always,
  },
  "pri(substrate.rpc.submit.withBittensorMevShield)": {
    read: ({ payload, txInfo }) => ({
      platform: "polkadot",
      network: { genesisHash: payload.genesisHash },
      address: payload.address,
      txType: txTypeOf(txInfo),
      submittedBy: "wallet",
      signOnly: false,
    }),
    succeeded: always,
  },
  "pri(solana.rpc.submit)": {
    read: ({ networkId, transaction, txInfo }) => {
      const { address } = parseTransactionInfo(deserializeTransaction(transaction))
      return address
        ? {
            platform: "solana",
            network: { networkId },
            address,
            txType: txTypeOf(txInfo),
            submittedBy: "wallet",
            signOnly: false,
          }
        : null
    },
    succeeded: always,
  },
  "pri(solana.sign.approve)": {
    read: (approval) => {
      const queued = requestStore.getRequest(approval.id)
      if (queued?.request.type !== "transaction" || approval.type !== "transaction") return null
      if (!approval.networkId) return null
      return {
        platform: "solana",
        network: { networkId: approval.networkId },
        address: queued.account.address,
        txType: "other",
        submittedBy: "dapp",
        signOnly: !queued.request.send,
      }
    },
    succeeded: always,
  },
  "pri(signing.approveSign)": { read: ({ id }) => storedSubstrateSign(id), succeeded: isTrue },
  "pri(signing.approveSign.hardware)": {
    read: ({ id }) => storedSubstrateSign(id),
    succeeded: isTrue,
  },
  "pri(signing.approveSign.qr)": {
    read: ({ id }) => storedSubstrateSign(id),
    succeeded: isTrue,
  },
} as const satisfies { [M in TxSubmissionMessage]: SubmissionPolicy<M> }

type MessagesWithRequestId = {
  [M in MessageTypes]: RequestTypes[M] extends { id: string } ? M : never
}[MessageTypes]

export type RequestDecision = "approved" | "rejected" | "closed"

const REQUEST_DECISIONS: Partial<Record<MessagesWithRequestId, RequestDecision>> = {
  "pri(eth.signing.approveSign)": "approved",
  "pri(eth.signing.approveSignHardware)": "approved",
  "pri(eth.signing.approveSignAndSend)": "approved",
  "pri(eth.signing.approveSignAndSendHardware)": "approved",
  "pri(eth.signing.cancel)": "rejected",
  "pri(eth.networks.add.approve)": "approved",
  "pri(eth.networks.add.cancel)": "rejected",
  "pri(eth.watchasset.requests.approve)": "approved",
  "pri(eth.watchasset.requests.cancel)": "rejected",
  "pri(signing.approveSign)": "approved",
  "pri(signing.approveSign.hardware)": "approved",
  "pri(signing.approveSign.qr)": "approved",
  "pri(signing.approveSign.signet)": "approved",
  "pri(signing.approveSign.vrf)": "approved",
  "pri(signing.cancel)": "rejected",
  "pri(sites.requests.approve)": "approved",
  "pri(sites.requests.approveSolSignIn)": "approved",
  "pri(sites.requests.reject)": "rejected",
  "pri(sites.requests.ignore)": "closed",
  "pri(solana.sign.approve)": "approved",
  "pri(solana.sign.cancel)": "rejected",
}

const isSubmission = (type: MessageTypes): type is TxSubmissionMessage =>
  Object.hasOwn(TX_SUBMISSION_POLICY, type)

const decisionOf = (type: MessageTypes): RequestDecision | undefined =>
  (REQUEST_DECISIONS as Partial<Record<MessageTypes, RequestDecision>>)[type]

type ErasedPolicy = {
  read: (request: unknown) => TxAttempt | null
  succeeded: (response: unknown) => boolean
}

const observeSubmission = (type: TxSubmissionMessage, request: unknown) => {
  const policy = TX_SUBMISSION_POLICY[type] as unknown as ErasedPolicy
  let attempt: TxAttempt | null
  try {
    attempt = policy.read(request)
  } catch {
    return null
  }
  if (!attempt) return null

  const { signOnly } = attempt
  const context = resolveTxContext(attempt).catch(() => null)
  return (outcome: MessageOutcome) =>
    context.then((ctx) => {
      if (!ctx) return
      if (!outcome.ok) {
        if (!signOnly)
          track("tx_broadcast_failed", { ...ctx, error_category: classifyError(outcome.error) })
        return
      }
      if (!policy.succeeded(outcome.response)) return
      track("tx_signed", { ...ctx, sign_only: signOnly })
      if (!signOnly) track("tx_broadcast", ctx)
    })
}

const CHANGE_OBSERVERS: readonly ((
  type: MessageTypes,
  request: unknown
) => ((response: unknown) => Promise<void>) | null)[] = [
  observeAccountMessage,
  observeDappMessage,
  observeChaindataMessage,
  observeNftMessage,
]

export const observeExtensionMessage = (
  type: MessageTypes,
  request: unknown
): ((outcome: MessageOutcome) => void) | null => {
  try {
    const decision = decisionOf(type)
    const requestId = decision ? (request as { id: string }).id : undefined
    if (decision && requestId) dappRequestTracker.noteDecision(requestId, decision, Date.now())

    const submission = isSubmission(type) ? observeSubmission(type, request) : null
    const changes = CHANGE_OBSERVERS.flatMap((observe) => observe(type, request) ?? [])
    if (!requestId && !submission && !changes.length) return null

    return (outcome) => {
      try {
        if (decision === "approved" && requestId && !outcome.ok)
          dappRequestTracker.noteApprovalFailure(requestId, classifyError(outcome.error))
        submission?.(outcome).catch(reportFailure)
        if (outcome.ok) for (const change of changes) change(outcome.response).catch(reportFailure)
      } catch (cause) {
        reportFailure(cause)
      }
    }
  } catch (cause) {
    reportFailure(cause)
    return null
  }
}
