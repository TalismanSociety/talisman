import { networkIdFromTokenId, parseTokenId } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { erc20Abi, type Hex, isAddressEqual, isHex, type Log, parseEventLogs } from "viem"

import type { SwapEnv } from "../env"
import { observeEvmLeg } from "../observeEvm"
import type { LegObservation, ObserveLegParams, PlanLegRuntime, QuoteLeg } from "../types"

export const LIFI_API_URL = "https://lifi.talisman.xyz/v1"

const INDETERMINATE: LegObservation = { status: "failed", reason: "indeterminate" }

/** the one field the engine reads from the step the UI module quoted: the bridge `/status` indexes by */
const toolOf = (data: unknown): string | undefined => {
  const steps = (data as { steps?: { tool?: unknown }[] } | undefined)?.steps
  const tool = steps?.[0]?.tool
  return typeof tool === "string" ? tool : undefined
}

const erc20Address = (tokenId: QuoteLeg["toTokenId"]): Hex | null => {
  const specs = parseTokenId(tokenId)
  return specs.type === "evm-erc20" ? specs.contractAddress : null
}

/** what `recipient` keeps of `token` after the receipt: the token's own Transfer events, not LI.FI's number */
const netReceived = (logs: Log[], token: Hex, recipient: Hex): bigint =>
  parseEventLogs({ abi: erc20Abi, eventName: "Transfer", logs })
    .filter((transfer) => isAddressEqual(transfer.address, token))
    .reduce((sum, { args }) => {
      if (isAddressEqual(args.to, recipient)) sum += args.value
      if (isAddressEqual(args.from, recipient)) sum -= args.value
      return sum
    }, 0n)

const landedWith = (hash: Hex, amount: bigint): LegObservation =>
  amount > 0n ? { status: "landed", hash, amount } : INDETERMINATE

type LifiTransfer =
  | { outcome: "pending" }
  | { outcome: "failed" }
  | {
      outcome: "delivered"
      toAddress: Hex
      receiving: { txHash: Hex; chainId: number; token: Hex }
    }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

/** `/status` is a pointer to the receiving transaction, every fact about the delivery is read from the chain */
const parseLifiTransfer = (body: unknown): LifiTransfer => {
  if (!isRecord(body)) throw new Error("Unexpected LI.FI status response")
  switch (body.status) {
    case "NOT_FOUND":
    case "PENDING":
      return { outcome: "pending" }
    case "DONE":
      break
    default:
      return { outcome: "failed" }
  }
  if (body.substatus !== "COMPLETED") return { outcome: "failed" }
  const receiving = isRecord(body.receiving) ? body.receiving : null
  const token = isRecord(receiving?.token) ? receiving.token.address : undefined
  if (
    !receiving ||
    !isHex(receiving.txHash) ||
    typeof receiving.chainId !== "number" ||
    !isHex(token) ||
    !isHex(body.toAddress)
  )
    throw new Error("Unexpected LI.FI status response")
  return {
    outcome: "delivered",
    toAddress: body.toAddress,
    receiving: { txHash: receiving.txHash, chainId: receiving.chainId, token },
  }
}

const fetchLifiTransfer = async (params: {
  txHash: Hex
  fromChain: string
  toChain: string
  bridge?: string
}): Promise<LifiTransfer> => {
  const query = new URLSearchParams(params)
  const res = await fetch(`${LIFI_API_URL}/status?${query}`)
  if (res.status === 404) return { outcome: "pending" }
  if (!res.ok) throw new Error(`LI.FI API error: ${res.status}`)
  return parseLifiTransfer(await res.json())
}

const observeDelivery = async (
  leg: QuoteLeg,
  recipient: Hex,
  token: Hex,
  sourceHash: Hex,
  env: SwapEnv
): Promise<LegObservation> => {
  const fromChain = networkIdFromTokenId(leg.fromTokenId)
  const toChain = networkIdFromTokenId(leg.toTokenId)
  const transfer = await fetchLifiTransfer({
    txHash: sourceHash,
    fromChain,
    toChain,
    bridge: toolOf(leg.data),
  })
  if (transfer.outcome === "pending") return { status: "pending" }
  if (transfer.outcome === "failed") return INDETERMINATE
  const { receiving, toAddress } = transfer
  if (
    String(receiving.chainId) !== toChain ||
    !isAddressEqual(receiving.token, token) ||
    !isAddressEqual(toAddress, recipient)
  )
    return INDETERMINATE

  const destination = await env.evmClient(toChain)
  const finalised = (await destination.getBlock({ blockTag: "finalized" })).number
  const receipt = await destination
    .getTransactionReceipt({ hash: receiving.txHash })
    .catch((err) => {
      if ((err as { name?: string }).name === "TransactionReceiptNotFoundError") return null
      throw err
    })
  if (!receipt || receipt.blockNumber > finalised) return { status: "pending" }
  if (receipt.status !== "success") return INDETERMINATE
  return landedWith(sourceHash, netReceived(receipt.logs, token, recipient))
}

/**
 * The source receipt settles the leg. When a later leg spends the output, the landed amount is what
 * the delivered token's Transfer events say the recipient received: in the source receipt for a
 * same-chain step, in the finalised receiving receipt `/status` points at for a bridge.
 */
const observeLeg = async (
  { leg, sent, handsOver }: ObserveLegParams,
  env: SwapEnv
): Promise<LegObservation> => {
  if (!leg.signer || !isEthereumAddress(leg.signer)) throw new Error("Invalid sender address")
  const source = await env.evmClient(networkIdFromTokenId(leg.fromTokenId))
  const observed = await observeEvmLeg(source, sent, leg.signer, () => leg.outputAmount)
  if (observed.status !== "landed" || !handsOver) return observed

  if (!leg.recipient || !isEthereumAddress(leg.recipient)) throw new Error("Invalid recipient")
  const token = erc20Address(leg.toTokenId)
  if (!token) return INDETERMINATE
  if (networkIdFromTokenId(leg.fromTokenId) === networkIdFromTokenId(leg.toTokenId)) {
    const receipt = await source.getTransactionReceipt({ hash: observed.hash })
    return landedWith(observed.hash, netReceived(receipt.logs, token, leg.recipient))
  }
  return observeDelivery(leg, leg.recipient, token, observed.hash, env)
}

export const lifiLegRuntime: PlanLegRuntime = {
  legDeadlineMs: 60 * 60_000,
  boundLeg: async () => null,
  observeLeg,
}
