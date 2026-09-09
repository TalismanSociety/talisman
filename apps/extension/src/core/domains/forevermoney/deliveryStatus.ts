import { log } from "@common/log"
import { isAddressEqual, type PublicClient, parseEventLogs } from "viem"
import { chainConnectorEvm } from "../../rpcs/chain-connector-evm"
import type { SwapStatus, WalletTransaction, WalletTransactionInfo } from "../transactions/types"
import {
  abiCcipOffRamp,
  abiForevermoneyAlphaGateway,
  abiForevermoneySpokeGateway,
  CCIP_EXECUTION_STATE_FAILURE,
  CCIP_EXECUTION_STATE_SUCCESS,
} from "./abi"
import {
  FOREVERMONEY_ALPHA_GATEWAY,
  type ForevermoneyRoute,
  findForevermoneyRoute,
} from "./constants"

const LOGS_CHUNK_SIZE = 5_000n
const DELIVERY_MAX_AGE_MS = 24 * 60 * 60 * 1_000

type ForevermoneyTxInfo = Extract<WalletTransactionInfo, { type: "swap-forevermoney" }>

// destination blocks already scanned per transaction, so each poll only reads new blocks
const scannedUntil = new Map<string, bigint>()

const getClient = async (networkId: string): Promise<PublicClient> => {
  const client = await chainConnectorEvm.getPublicClientForEvmNetwork(networkId)
  if (!client) throw new Error(`No EVM client for network ${networkId}`)
  return client as PublicClient
}

const getMessageId = async (
  client: PublicClient,
  route: ForevermoneyRoute,
  hash: `0x${string}`
): Promise<`0x${string}` | "pending" | "reverted" | "missing"> => {
  const receipt = await client.getTransactionReceipt({ hash }).catch(() => null)
  if (!receipt) return "pending"
  if (receipt.status === "reverted") return "reverted"

  const gateway =
    route.direction === "evm-to-spoke" ? FOREVERMONEY_ALPHA_GATEWAY : route.spoke.gateway
  const logs = receipt.logs.filter((l) => isAddressEqual(l.address, gateway))

  if (route.direction === "evm-to-spoke") {
    const [event] = parseEventLogs({
      abi: abiForevermoneyAlphaGateway,
      eventName: "BridgedOut",
      logs,
    })
    return event?.args.messageId ?? "missing"
  }

  const [event] = parseEventLogs({
    abi: abiForevermoneySpokeGateway,
    eventName: "BridgedToFinney",
    logs,
  })
  return event?.args.messageId ?? "missing"
}

const findExecutionState = async (
  txId: string,
  client: PublicClient,
  route: ForevermoneyRoute,
  messageId: `0x${string}`,
  startBlock: bigint
) => {
  const latest = await client.getBlockNumber()
  let fromBlock = scannedUntil.get(txId) ?? startBlock

  while (fromBlock <= latest) {
    const toBlock =
      fromBlock + LOGS_CHUNK_SIZE - 1n < latest ? fromBlock + LOGS_CHUNK_SIZE - 1n : latest
    const logs = await client.getLogs({
      address: route.destinationOffRamp,
      event: abiCcipOffRamp[0],
      args: { sourceChainSelector: route.sourceSelector, messageId },
      fromBlock,
      toBlock,
    })
    const final = logs.findLast(
      (l) =>
        l.args.state === CCIP_EXECUTION_STATE_SUCCESS ||
        l.args.state === CCIP_EXECUTION_STATE_FAILURE
    )
    if (final) return final
    scannedUntil.set(txId, toBlock + 1n)
    fromBlock = toBlock + 1n
  }
  return null
}

const wasBookedClaimable = async (client: PublicClient, hash: `0x${string}`) => {
  const receipt = await client.getTransactionReceipt({ hash })
  const logs = receipt.logs.filter((l) => isAddressEqual(l.address, FOREVERMONEY_ALPHA_GATEWAY))
  return (
    parseEventLogs({ abi: abiForevermoneyAlphaGateway, eventName: "Claimable", logs }).length > 0
  )
}

/**
 * Tracks a ForeverMoney bridge transfer: reads the CCIP message id from the source receipt, then
 * waits for the destination OffRamp to report the message executed.
 * - `finished`: delivered
 * - `refunded`: delivered on Bittensor EVM but the gateway booked the funds as claimable by the sender
 * - `failed`: source reverted or CCIP execution failed (manual retry through the CCIP explorer)
 */
export const fetchForevermoneyStatus = async (
  tx: WalletTransaction,
  txInfo: ForevermoneyTxInfo
): Promise<SwapStatus> => {
  if (tx.platform !== "ethereum") return "invalid"

  const route = findForevermoneyRoute(txInfo.fromTokenId, txInfo.toTokenId)
  if (!route) return "invalid"

  const sourceClient = await getClient(route.sourceNetworkId)
  const messageId = await getMessageId(sourceClient, route, tx.hash)
  if (messageId === "pending") return "confirming"
  if (messageId === "reverted") return "failed"
  if (messageId === "missing") {
    log.warn("ForeverMoney bridge transaction has no message id", { txId: tx.id })
    return "invalid"
  }

  const destinationClient = await getClient(route.destinationNetworkId)
  const execution = await findExecutionState(
    tx.id,
    destinationClient,
    route,
    messageId,
    BigInt(txInfo.destinationStartBlock)
  )

  if (!execution) {
    if (Date.now() - tx.timestamp >= DELIVERY_MAX_AGE_MS) return "unknown"
    return "exchanging"
  }

  scannedUntil.delete(tx.id)
  if (execution.args.state === CCIP_EXECUTION_STATE_FAILURE) return "failed"

  if (route.direction !== "evm-to-spoke" && execution.transactionHash) {
    const claimable = await wasBookedClaimable(destinationClient, execution.transactionHash)
    if (claimable) return "refunded"
  }

  return "finished"
}
