import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { decodeScale } from "@talismn/scale"

import log from "../../log"
import { hasStorageItems } from "../shared"
import { parseMetadataRpcCached } from "../shared/parseMetadataRpcCached"
import { fetchRpcQueryPack, type MaybeStateKey, type RpcQueryPack } from "../shared/rpcQueryPack"
import type { SubDTaoBalanceMeta, SubDTaoRootStakeHoldMeta } from "./types"

/**
 * Extracts the root-stake hold from a balance's raw values (BalanceJson), if any.
 * While present, the pair's root stake cannot leave root — unstake/move/swap/transfer
 * would fail with `RootStakeLocked`. Only present while the window was still running
 * as of the last balances poll.
 */
export const findDTaoRootStakeHold = (
  balance: { values?: Array<{ meta?: unknown }> } | null | undefined
): SubDTaoRootStakeHoldMeta | null => {
  for (const value of balance?.values ?? []) {
    const hold = (value.meta as SubDTaoBalanceMeta | undefined)?.rootStakeHold
    if (hold?.type === "root-stake-hold") return hold
  }
  return null
}

export type FetchedRootStakeHold = {
  address: string
  hotkey: string
  /** block at which the pair's root stake can leave root again */
  unlockAtBlock: number
}

/**
 * Fetches active root-stake hold windows (spec 441): when `RootStakeUnlockInterval` is
 * non-zero, root stake cannot leave root (remove/move/swap/transfer) until `interval`
 * blocks after the pair's last root stake add/remove/claim (`LastColdkeyHotkeyStakeBlock`).
 * Pairs already past their window are omitted — a returned hold means the pair's root
 * stake is currently unremovable.
 *
 * The interval is 0 (disabled) unless governance enables it: the per-pair queries only
 * run when it is non-zero.
 */
export const fetchRootStakeHolds = async (
  connector: IChainConnectorDot,
  networkId: string,
  metadataRpc: `0x${string}`,
  rootPairs: Array<{ address: string; hotkey: string }>
): Promise<FetchedRootStakeHold[]> => {
  if (!rootPairs.length) return []

  const { unifiedMetadata, builder } = parseMetadataRpcCached(metadataRpc)
  if (
    !hasStorageItems(unifiedMetadata, "SubtensorModule", [
      "RootStakeUnlockInterval",
      "LastColdkeyHotkeyStakeBlock",
    ])
  )
    return []

  try {
    const interval = await fetchUnlockInterval(connector, networkId, builder)
    if (interval === 0n) return []

    const [lastStakeBlocks, currentBlock] = await Promise.all([
      fetchLastStakeBlocks(connector, networkId, builder, rootPairs),
      fetchCurrentBlock(connector, networkId),
    ])

    return lastStakeBlocks.flatMap(({ address, hotkey, lastStakeBlock }) => {
      // no recorded root stake op for the pair => nothing to age the hold from
      if (lastStakeBlock === 0n) return []
      const unlockAtBlock = lastStakeBlock + interval
      if (unlockAtBlock <= BigInt(currentBlock)) return []
      return [{ address, hotkey, unlockAtBlock: Number(unlockAtBlock) }]
    })
  } catch (cause) {
    // a missing hold reads as "free to unstake" — transient failures must fail the poll
    // (balances go stale) instead of silently dropping an active hold
    log.warn(`Failed to fetch root stake holds on ${networkId}`, { cause })
    throw cause
  }
}

const fetchUnlockInterval = async (
  connector: IChainConnectorDot,
  networkId: string,
  builder: ReturnType<typeof parseMetadataRpcCached>["builder"]
): Promise<bigint> => {
  const storageCoder = builder.buildStorage("SubtensorModule", "RootStakeUnlockInterval")
  const query: RpcQueryPack<bigint> = {
    stateKeys: [storageCoder.keys.enc() as MaybeStateKey],
    decodeResult: (changes) => {
      const hexValue = changes[0]
      // absent value = default 0 = hold disabled
      if (!hexValue) return 0n
      const decoded = decodeScale<bigint | null>(
        storageCoder,
        hexValue,
        `Failed to decode RootStakeUnlockInterval on ${networkId}`
      )
      if (decoded === null)
        throw new Error(`Failed to decode RootStakeUnlockInterval on ${networkId}`)
      return decoded
    },
  }
  const [interval] = await fetchRpcQueryPack(connector, networkId, [query])
  return interval ?? 0n
}

const fetchLastStakeBlocks = async (
  connector: IChainConnectorDot,
  networkId: string,
  builder: ReturnType<typeof parseMetadataRpcCached>["builder"],
  rootPairs: Array<{ address: string; hotkey: string }>
): Promise<Array<{ address: string; hotkey: string; lastStakeBlock: bigint }>> => {
  const storageCoder = builder.buildStorage("SubtensorModule", "LastColdkeyHotkeyStakeBlock")

  const queries = rootPairs.map(
    ({
      address,
      hotkey,
    }): RpcQueryPack<{ address: string; hotkey: string; lastStakeBlock: bigint }> => {
      let stateKey: MaybeStateKey
      try {
        stateKey = storageCoder.keys.enc(address, hotkey) as MaybeStateKey
      } catch (cause) {
        // an unencodable key (metadata drift) would read as "no hold", understating the
        // restriction — fail the poll (stale) instead
        log.warn(
          `Failed to encode LastColdkeyHotkeyStakeBlock key (address=${address}, hotkey=${hotkey}) on ${networkId}`,
          { cause }
        )
        throw cause
      }

      return {
        stateKeys: [stateKey],
        decodeResult: (changes) => {
          const hexValue = changes[0]
          if (!hexValue) return { address, hotkey, lastStakeBlock: 0n }

          const decoded = decodeScale<bigint | null>(
            storageCoder,
            hexValue,
            `Failed to decode LastColdkeyHotkeyStakeBlock for (address=${address}, hotkey=${hotkey}) on ${networkId}`
          )
          // present-but-undecodable is a bad response, not an absent hold
          if (decoded === null)
            throw new Error(
              `Failed to decode LastColdkeyHotkeyStakeBlock for (address=${address}, hotkey=${hotkey}) on ${networkId}`
            )
          return { address, hotkey, lastStakeBlock: decoded }
        },
      }
    }
  )

  return fetchRpcQueryPack(connector, networkId, queries)
}

const fetchCurrentBlock = async (
  connector: IChainConnectorDot,
  networkId: string
): Promise<number> => {
  const header = await connector.send<{ number: string } | null>(networkId, "chain_getHeader", [])
  const blockNumber = Number.parseInt(header?.number ?? "", 16)
  if (Number.isNaN(blockNumber))
    throw new Error(`Failed to fetch current block number on ${networkId}`)
  return blockNumber
}
