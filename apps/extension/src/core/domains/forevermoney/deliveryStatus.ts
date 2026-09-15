import { log } from "@common/log"
import { type GetLogsReturnType, isAddressEqual, type PublicClient, parseEventLogs } from "viem"
import { chainConnectorEvm } from "../../rpcs/chain-connector-evm"
import {
  FINAL_SWAP_STATUSES,
  type SwapStatus,
  type WalletTransaction,
  type WalletTransactionInfo,
} from "../transactions/types"
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

// the smallest eth_getLogs range cap among the usable chaindata RPCs
const LOGS_CHUNK_SIZE = 2_000n
const DELIVERY_MAX_AGE_MS = 24 * 60 * 60 * 1_000
// blocks re-read on every poll, so a delivery landing in a replaced block is still found
const REORG_OVERLAP_BLOCKS = 12n
// same depth as the source transaction watcher before an execution outcome is recorded
const DELIVERY_CONFIRMATIONS = 2n

type ForevermoneyTxInfo = Extract<WalletTransactionInfo, { type: "swap-forevermoney" }>
type ExecutionLog = GetLogsReturnType<(typeof abiCcipOffRamp)[0]>[number]

type DeliveryScan = {
  nextBlock: bigint
  execution: ExecutionLog | undefined
}

// destination scan progress per transaction, so each poll only reads new blocks
const scans = new Map<string, DeliveryScan>()

const maxBigInt = (a: bigint, b: bigint) => (a > b ? a : b)
const minBigInt = (a: bigint, b: bigint) => (a < b ? a : b)

const isDeliveryExpired = (tx: WalletTransaction) =>
  Date.now() - tx.timestamp >= DELIVERY_MAX_AGE_MS

/**
 * A failed CCIP execution can be retried manually and a missing delivery may still land, so both
 * stay open until the delivery window closes.
 */
export const isForevermoneyStatusFinal = (tx: WalletTransaction, status: SwapStatus) => {
  if (status === "failed" || status === "unknown") return isDeliveryExpired(tx)
  return FINAL_SWAP_STATUSES.includes(status)
}

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

const isFinalExecution = (l: ExecutionLog) =>
  l.args.state === CCIP_EXECUTION_STATE_SUCCESS || l.args.state === CCIP_EXECUTION_STATE_FAILURE

/**
 * Returns the most recent final execution of the message and its depth. CCIP lets a failed message
 * be executed again manually, so the latest state wins. Blocks inside the reorg window are read
 * again on every poll, and an execution remembered from a previous poll only survives when it sits
 * below that window.
 */
const findLatestExecution = async (
  txId: string,
  client: PublicClient,
  route: ForevermoneyRoute,
  messageId: `0x${string}`,
  startBlock: bigint
) => {
  const latest = await client.getBlockNumber()
  const scan = scans.get(txId) ?? { nextBlock: startBlock, execution: undefined }
  let execution =
    scan.execution && scan.execution.blockNumber < scan.nextBlock ? scan.execution : undefined

  let fromBlock = scan.nextBlock
  while (fromBlock <= latest) {
    const toBlock = minBigInt(fromBlock + LOGS_CHUNK_SIZE - 1n, latest)
    const logs = await client.getLogs({
      address: route.destinationOffRamp,
      event: abiCcipOffRamp[0],
      args: { sourceChainSelector: route.sourceSelector, messageId },
      fromBlock,
      toBlock,
    })
    execution = logs.findLast(isFinalExecution) ?? execution
    fromBlock = toBlock + 1n
  }

  scans.set(txId, {
    nextBlock: maxBigInt(startBlock, latest + 1n - REORG_OVERLAP_BLOCKS),
    execution,
  })

  const confirmations = execution ? latest - execution.blockNumber + 1n : 0n
  return { execution, confirmations }
}

/**
 * The OffRamp executes several messages in one transaction and emits ExecutionStateChanged after
 * each one, so the gateway events of this message are the ones between the previous
 * ExecutionStateChanged event and its own.
 */
const wasBookedClaimable = async (
  client: PublicClient,
  route: ForevermoneyRoute,
  execution: ExecutionLog
) => {
  const receipt = await client.getTransactionReceipt({ hash: execution.transactionHash })

  const previousExecutionIndex = parseEventLogs({
    abi: abiCcipOffRamp,
    eventName: "ExecutionStateChanged",
    logs: receipt.logs.filter((l) => isAddressEqual(l.address, route.destinationOffRamp)),
  })
    .map((l) => l.logIndex)
    .filter((i) => i < execution.logIndex)
    .reduce((max, i) => Math.max(max, i), -1)

  const messageLogs = receipt.logs.filter(
    (l) =>
      l.logIndex > previousExecutionIndex &&
      l.logIndex < execution.logIndex &&
      isAddressEqual(l.address, FOREVERMONEY_ALPHA_GATEWAY)
  )

  return (
    parseEventLogs({ abi: abiForevermoneyAlphaGateway, eventName: "Claimable", logs: messageLogs })
      .length > 0
  )
}

/**
 * Tracks a ForeverMoney bridge transfer: reads the CCIP message id from the source receipt, then
 * waits for the destination OffRamp to report the message executed.
 * - `finished`: delivered
 * - `refunded`: delivered on Bittensor EVM but the gateway booked the funds as claimable by the sender
 * - `failed`: source reverted or CCIP execution failed (manual retry through the CCIP explorer);
 *   the watcher keeps polling a failed execution until the delivery window closes
 */
export const fetchForevermoneyStatus = async (
  tx: WalletTransaction,
  txInfo: ForevermoneyTxInfo
): Promise<SwapStatus> => {
  const status = await resolveStatus(tx, txInfo)
  if (isForevermoneyStatusFinal(tx, status)) scans.delete(tx.id)
  return status
}

const resolveStatus = async (
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
  const { execution, confirmations } = await findLatestExecution(
    tx.id,
    destinationClient,
    route,
    messageId,
    BigInt(txInfo.destinationStartBlock)
  )

  if (!execution) return isDeliveryExpired(tx) ? "unknown" : "exchanging"
  if (confirmations < DELIVERY_CONFIRMATIONS) return "verifying"
  if (execution.args.state === CCIP_EXECUTION_STATE_FAILURE) return "failed"

  if (route.direction !== "evm-to-spoke") {
    const claimable = await wasBookedClaimable(destinationClient, route, execution)
    if (claimable) return "refunded"
  }

  return "finished"
}
