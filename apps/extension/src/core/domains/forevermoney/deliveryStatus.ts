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
  abiCcipRouter,
  abiForevermoneyAlphaGateway,
  abiForevermoneySpokeGateway,
  CCIP_EXECUTION_STATE_FAILURE,
  CCIP_EXECUTION_STATE_SUCCESS,
} from "./abi"
import {
  FOREVERMONEY_HUB_GATEWAYS,
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
type ExecutionLog =
  | GetLogsReturnType<(typeof abiCcipOffRamp)[0]>[number]
  | GetLogsReturnType<(typeof abiCcipOffRamp)[1]>[number]

type DeliveryScan = {
  nextBlock: bigint
  execution: ExecutionLog | undefined
  offRamps: `0x${string}`[]
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

  const gateways = [route.sourceGateway, ...route.legacySourceGateways]
  const logs = receipt.logs.filter((l) => gateways.some((g) => isAddressEqual(l.address, g)))

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

const byLogPosition = (a: ExecutionLog, b: ExecutionLog) =>
  a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : a.blockNumber < b.blockNumber ? -1 : 1

const includesAddress = (addresses: `0x${string}`[], address: `0x${string}`) =>
  addresses.some((a) => isAddressEqual(a, address))

/**
 * CCIP moves execution to new OffRamps on upgrades and the destination router only lists the
 * current ones, so the known OffRamp stays in the set for executions it already emitted
 */
const getOffRamps = async (client: PublicClient, route: ForevermoneyRoute) => {
  const routerOffRamps = await client.readContract({
    abi: abiCcipRouter,
    address: route.destinationCcipRouter,
    functionName: "getOffRamps",
  })
  const laneOffRamps = routerOffRamps
    .filter((offRamp) => offRamp.sourceChainSelector === route.sourceSelector)
    .map((offRamp) => offRamp.offRamp)
    .filter((offRamp) => !isAddressEqual(offRamp, route.destinationOffRamp))
  return [route.destinationOffRamp, ...laneOffRamps]
}

/** Blocks scanned before an OffRamp joined the set were never read for it, so the scan restarts */
const getScan = (txId: string, startBlock: bigint, offRamps: `0x${string}`[]): DeliveryScan => {
  const scan = scans.get(txId)
  if (scan && offRamps.every((offRamp) => includesAddress(scan.offRamps, offRamp))) return scan
  return { nextBlock: startBlock, execution: undefined, offRamps }
}

const getExecutionLogs = async (
  client: PublicClient,
  route: ForevermoneyRoute,
  offRamps: `0x${string}`[],
  messageId: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint
): Promise<ExecutionLog[]> => {
  const [legacyLogs, v2Logs] = await Promise.all([
    client.getLogs({
      address: offRamps,
      event: abiCcipOffRamp[0],
      args: { sourceChainSelector: route.sourceSelector, messageId },
      fromBlock,
      toBlock,
    }),
    client.getLogs({
      address: offRamps,
      event: abiCcipOffRamp[1],
      args: { sourceChainSelector: route.sourceSelector, messageId },
      fromBlock,
      toBlock,
    }),
  ])
  return [...legacyLogs, ...v2Logs].sort(byLogPosition)
}

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
  const [latest, offRamps] = await Promise.all([
    client.getBlockNumber(),
    getOffRamps(client, route),
  ])
  const scan = getScan(txId, startBlock, offRamps)
  let execution =
    scan.execution && scan.execution.blockNumber < scan.nextBlock ? scan.execution : undefined

  let fromBlock = scan.nextBlock
  while (fromBlock <= latest) {
    const toBlock = minBigInt(fromBlock + LOGS_CHUNK_SIZE - 1n, latest)
    const logs = await getExecutionLogs(client, route, offRamps, messageId, fromBlock, toBlock)
    execution = logs.findLast(isFinalExecution) ?? execution
    fromBlock = toBlock + 1n
  }

  scans.set(txId, {
    nextBlock: maxBigInt(startBlock, latest + 1n - REORG_OVERLAP_BLOCKS),
    execution,
    offRamps,
  })

  const confirmations = execution ? latest - execution.blockNumber + 1n : 0n
  return { execution, confirmations }
}

/**
 * The OffRamp executes several messages in one transaction and emits ExecutionStateChanged after
 * each one, so the gateway events of this message are the ones between the previous
 * ExecutionStateChanged event and its own. The gateway books an undelivered message as claimable,
 * or reports it with NotDelivered.
 */
const wasNotDelivered = async (client: PublicClient, execution: ExecutionLog) => {
  const receipt = await client.getTransactionReceipt({ hash: execution.transactionHash })

  const previousExecutionIndex = parseEventLogs({
    abi: abiCcipOffRamp,
    eventName: "ExecutionStateChanged",
    logs: receipt.logs.filter((l) => isAddressEqual(l.address, execution.address)),
  })
    .map((l) => l.logIndex)
    .filter((i) => i < execution.logIndex)
    .reduce((max, i) => Math.max(max, i), -1)

  const messageLogs = receipt.logs.filter(
    (l) =>
      l.logIndex > previousExecutionIndex &&
      l.logIndex < execution.logIndex &&
      includesAddress(FOREVERMONEY_HUB_GATEWAYS, l.address)
  )

  return (
    parseEventLogs({
      abi: abiForevermoneyAlphaGateway,
      eventName: ["Claimable", "NotDelivered"],
      logs: messageLogs,
    }).length > 0
  )
}

/**
 * Tracks a ForeverMoney bridge transfer: reads the CCIP message id from the source receipt, then
 * waits for the destination OffRamp to report the message executed.
 * - `finished`: delivered
 * - `refunded`: delivered on Bittensor EVM but the gateway booked the funds as claimable by the sender
 *   or reported them as not delivered
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
    const notDelivered = await wasNotDelivered(destinationClient, execution)
    if (notDelivered) return "refunded"
  }

  return "finished"
}
