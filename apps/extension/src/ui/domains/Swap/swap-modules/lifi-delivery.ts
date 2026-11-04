import { networkIdFromTokenId, parseTokenId, type TokenId } from "@talismn/chaindata-provider"
import { isEthereumAddress } from "@talismn/crypto"
import { erc20Abi, type Hex, isAddressEqual, isHex, type Log, parseEventLogs } from "viem"
import type { LegOutcome, QuoteLeg, SettleLegParams, SwapEnv } from "./common.swap-module"
import { LIFI_API_URL } from "./lifi-api"

const POLL_MS = 5_000

const undelivered = (hash: Hex): LegOutcome => ({ landed: false, hash, stop: "undelivered" })

const landedWith = (hash: Hex, amount: bigint): LegOutcome =>
  amount > 0n ? { landed: true, hash, amount } : undelivered(hash)

const erc20Address = (tokenId: TokenId): Hex | null => {
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

const fetchLifiTransfer = async (
  params: { txHash: Hex; fromChain: string; toChain: string },
  env: SwapEnv
): Promise<LifiTransfer> => {
  const res = await env
    .proxyFetch(`${LIFI_API_URL}/status?${new URLSearchParams(params)}`)
    .catch(() => null)
  if (!res?.ok) return { outcome: "pending" }
  return parseLifiTransfer(await res.json())
}

type Delivery = { leg: QuoteLeg; recipient: Hex; token: Hex; sourceHash: Hex }

const readBridgeDelivery = async (
  { leg, recipient, token, sourceHash }: Delivery,
  env: SwapEnv
): Promise<LegOutcome | null> => {
  const fromChain = networkIdFromTokenId(leg.fromTokenId)
  const toChain = networkIdFromTokenId(leg.toTokenId)
  const transfer = await fetchLifiTransfer({ txHash: sourceHash, fromChain, toChain }, env)
  if (transfer.outcome === "pending") return null
  if (transfer.outcome === "failed") return undelivered(sourceHash)
  const { receiving, toAddress } = transfer
  if (
    String(receiving.chainId) !== toChain ||
    !isAddressEqual(receiving.token, token) ||
    !isAddressEqual(toAddress, recipient)
  )
    return undelivered(sourceHash)

  const destination = await env.evmClient(toChain)
  const [receipt, latest] = await Promise.all([
    destination.getTransactionReceipt({ hash: receiving.txHash }).catch(() => null),
    destination.getBlockNumber({ cacheTime: 0 }).catch(() => null),
  ])
  if (!receipt || latest === null || receipt.blockNumber >= latest) return null
  if (receipt.status !== "success") return undelivered(sourceHash)
  return landedWith(sourceHash, netReceived(receipt.logs, token, recipient))
}

const readDelivery = async (delivery: Delivery, env: SwapEnv): Promise<LegOutcome | null> => {
  const { leg, recipient, token, sourceHash } = delivery
  const fromChain = networkIdFromTokenId(leg.fromTokenId)
  if (fromChain !== networkIdFromTokenId(leg.toTokenId)) return readBridgeDelivery(delivery, env)

  const source = await env.evmClient(fromChain)
  const receipt = await source.getTransactionReceipt({ hash: sourceHash }).catch(() => null)
  return receipt && landedWith(sourceHash, netReceived(receipt.logs, token, recipient))
}

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    signal.throwIfAborted()
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true }
    )
  })

export const settleLifiLeg = async (
  { leg, hash }: SettleLegParams,
  env: SwapEnv,
  signal: AbortSignal
): Promise<LegOutcome> => {
  const settled = await env.waitForTransaction(networkIdFromTokenId(leg.fromTokenId), hash, signal)
  if (!settled.landed) return settled

  const token = erc20Address(leg.toTokenId)
  if (!token || !leg.recipient || !isEthereumAddress(leg.recipient))
    return undelivered(settled.hash)

  const delivery: Delivery = { leg, recipient: leg.recipient, token, sourceHash: settled.hash }
  for (;;) {
    const outcome = await readDelivery(delivery, env)
    if (outcome) return outcome
    await wait(POLL_MS, signal)
  }
}
