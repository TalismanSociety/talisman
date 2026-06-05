import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { decodeScale, parseMetadataRpc } from "@talismn/scale"

import log from "../../log"
import { fetchRuntimeCallResult, hasRuntimeApi, hasStorageItems } from "../shared"
import { fetchRpcQueryPack, type MaybeStateKey, type RpcQueryPack } from "../shared/rpcQueryPack"
import type {
  GetColdkeyLockResult,
  GetStakeInfosResult,
  SubDTaoBalanceMeta,
  SubDTaoConvictionLock,
  SubDTaoConvictionLockType,
} from "./types"

const U64F64_FRACTIONAL_BITS = 64n
// Bittensor Lock uses Blake2_128Concat<AccountId32> for the final hotkey segment.
const BLAKE2_128_CONCAT_ACCOUNT_ID_HEX_LENGTH = (16 + 32) * 2

export type ConvictionLockCandidate = {
  address: string
  netuid: number
  hotkey: string
}

export type FetchedConvictionLock = {
  address: string
  netuid: number
  lock: SubDTaoConvictionLock
}

const convictionLockKey = (address: string, netuid: number) => `${address}:${netuid}`

export const getConvictionLockCandidates = (
  stakeInfos: GetStakeInfosResult
): ConvictionLockCandidate[] => {
  const candidatesByKey = new Map<string, ConvictionLockCandidate>()

  for (const [address, stakes] of stakeInfos) {
    for (const stake of stakes) {
      const key = `${address}:${stake.netuid}:${stake.hotkey}`
      if (!candidatesByKey.has(key)) {
        candidatesByKey.set(key, {
          address,
          netuid: stake.netuid,
          hotkey: stake.hotkey,
        })
      }
    }
  }

  return [...candidatesByKey.values()]
}

export const getConvictionLockPairs = (
  candidates: ConvictionLockCandidate[]
): Array<Pick<ConvictionLockCandidate, "address" | "netuid">> => {
  const pairsByKey = new Map<string, Pick<ConvictionLockCandidate, "address" | "netuid">>()

  for (const { address, netuid } of candidates) {
    const key = convictionLockKey(address, netuid)
    if (!pairsByKey.has(key)) pairsByKey.set(key, { address, netuid })
  }

  return [...pairsByKey.values()]
}

export const getConvictionLockLabel = (lockType: SubDTaoConvictionLockType): string =>
  lockType === "perpetual" ? "Perpetual Conviction Lock" : "Decaying Conviction Lock"

export type DTaoConvictionLockInfo = {
  amount: bigint
  /** the hotkey the lock is keyed on: required to top-up (the chain rejects a different hotkey) */
  hotkey: string
  lockType: SubDTaoConvictionLockType
  label: string
}

// structural subset of the formatted locks exposed by Balance#locks,
// kept loose to avoid a circular dependency on the Balance class
type BalanceLockLike = {
  amount: { planck: bigint }
  meta?: unknown
}

/**
 * Extracts the dtao conviction lock from a Balance locks array (Balance#locks), if any.
 * The locked amount cannot be unstaked or transferred until the lock decays (or ever, if perpetual).
 */
export const findDTaoConvictionLock = (
  locks: BalanceLockLike[] | null | undefined
): DTaoConvictionLockInfo | null => {
  for (const lock of locks ?? []) {
    const meta = lock.meta as SubDTaoBalanceMeta | undefined
    if (meta?.convictionLock?.type !== "conviction-lock") continue

    const lockType = meta.convictionLock.lockType
    return {
      amount: lock.amount.planck,
      hotkey: meta.convictionLock.hotkey,
      lockType,
      label: getConvictionLockLabel(lockType),
    }
  }

  return null
}

export const toBigIntValue = (value: unknown): bigint => {
  if (typeof value === "bigint") return value
  if (typeof value === "number") return Number.isFinite(value) ? BigInt(Math.trunc(value)) : 0n
  if (typeof value === "string") {
    if (!value) return 0n
    try {
      return BigInt(value)
    } catch {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? BigInt(Math.trunc(parsed)) : 0n
    }
  }

  if (Array.isArray(value)) return value.length ? toBigIntValue(value[0]) : 0n

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    for (const key of ["bits", "value", "inner", "0"]) {
      if (record[key] !== undefined) return toBigIntValue(record[key])
    }
  }

  return 0n
}

export const u64f64RawToPlanck = (value: unknown): bigint => {
  return toBigIntValue(value) >> U64F64_FRACTIONAL_BITS
}

/**
 * Fetches Bittensor conviction locks (SubtensorModule.Lock) for the (coldkey, netuid) pairs found in stakeInfos.
 *
 * On-chain, a lock constrains the coldkey's TOTAL alpha on the subnet across all of its hotkeys
 * (available_to_unstake = Σ stakes - locked_mass), with at most one locked hotkey per (coldkey, netuid).
 * The lock is reported with the hotkey it is keyed on (used for conviction credit and lock top-ups),
 * and is attached to the subnet's base token balance rather than to a staking position.
 */
export const fetchConvictionLocks = async (
  connector: IChainConnectorDot,
  networkId: string,
  metadataRpc: `0x${string}`,
  stakeInfos: GetStakeInfosResult
): Promise<FetchedConvictionLock[]> => {
  const candidates = getConvictionLockCandidates(stakeInfos)
  if (!candidates.length) return []

  const { unifiedMetadata } = parseMetadataRpc(metadataRpc)
  if (
    !hasRuntimeApi(unifiedMetadata, "StakeInfoRuntimeApi", "get_coldkey_lock") ||
    !hasStorageItems(unifiedMetadata, "SubtensorModule", ["Lock", "DecayingLock"])
  ) {
    return []
  }

  try {
    const lockStorageCoder = buildStorageCoder(metadataRpc, "SubtensorModule", "Lock")
    const decayingLockStorageCoder = buildStorageCoder(
      metadataRpc,
      "SubtensorModule",
      "DecayingLock"
    )

    const pairs = getConvictionLockPairs(candidates)

    const lockHotkeyByPair = await fetchConvictionLockHotkeys(
      connector,
      networkId,
      pairs,
      candidates,
      lockStorageCoder
    )
    if (!lockHotkeyByPair.size) return []

    const pairsWithLocks = pairs.filter(({ address, netuid }) =>
      lockHotkeyByPair.has(convictionLockKey(address, netuid))
    )

    const [lockModesByPair, lockStates] = await Promise.all([
      fetchConvictionLockModes(connector, networkId, pairsWithLocks, decayingLockStorageCoder),
      fetchColdkeyLockStates(connector, networkId, metadataRpc, pairsWithLocks),
    ])

    return lockStates.flatMap(({ address, netuid, lockState }) => {
      const amount = toBigIntValue(lockState?.locked_mass)
      const convictionRaw = toBigIntValue(lockState?.conviction)
      // keep zero-mass locks that still carry conviction ("ghost" locks): the chain keeps the
      // Lock entry alive and pins future lock_stake calls to its hotkey (LockHotkeyMismatch)
      if (amount <= 0n && convictionRaw <= 0n) return []

      const hotkey = lockHotkeyByPair.get(convictionLockKey(address, netuid))
      if (!hotkey) return []

      const conviction = u64f64RawToPlanck(lockState?.conviction)

      return [
        {
          address,
          netuid,
          lock: {
            amount,
            hotkey,
            lockType: lockModesByPair.get(convictionLockKey(address, netuid)) ?? "decaying",
            conviction: conviction.toString(),
            convictionRaw: convictionRaw.toString(),
            lastUpdate: toBigIntValue(lockState?.last_update).toString(),
          },
        },
      ]
    })
  } catch (cause) {
    log.warn(`Failed to fetch Bittensor conviction locks on ${networkId}`, { cause })
    return []
  }
}

const fetchConvictionLockHotkeys = async (
  connector: IChainConnectorDot,
  networkId: string,
  pairs: Array<Pick<ConvictionLockCandidate, "address" | "netuid">>,
  candidates: ConvictionLockCandidate[],
  storageCoder: ReturnType<ReturnType<typeof parseMetadataRpc>["builder"]["buildStorage"]>
): Promise<Map<string, string>> => {
  const candidateByPair = new Map<string, ConvictionLockCandidate>()
  for (const candidate of candidates) {
    const key = convictionLockKey(candidate.address, candidate.netuid)
    if (!candidateByPair.has(key)) candidateByPair.set(key, candidate)
  }

  const hotkeys = await Promise.all(
    pairs.map(async ({ address, netuid }): Promise<[string, string | null]> => {
      const pairKey = convictionLockKey(address, netuid)
      const candidate = candidateByPair.get(pairKey)
      if (!candidate) return [pairKey, null]

      let keyPrefix: `0x${string}`
      try {
        const fullKey = storageCoder.keys.enc(
          candidate.address,
          candidate.netuid,
          candidate.hotkey
        ) as `0x${string}`
        keyPrefix = fullKey.slice(
          0,
          fullKey.length - BLAKE2_128_CONCAT_ACCOUNT_ID_HEX_LENGTH
        ) as `0x${string}`
      } catch (cause) {
        log.warn(
          `Failed to encode conviction Lock key prefix (netuid=${candidate.netuid}, address=${candidate.address}) on ${networkId}`,
          { cause }
        )
        return [pairKey, null]
      }

      try {
        const stateKeys = await connector.send<`0x${string}`[]>(networkId, "state_getKeys", [
          keyPrefix,
        ])
        if (!stateKeys.length) return [pairKey, null]

        const decoded = storageCoder.keys.dec(stateKeys[0]) as [string, number, string]
        return [pairKey, decoded[2] ?? null]
      } catch (cause) {
        log.warn(
          `Failed to fetch conviction Lock keys (netuid=${netuid}, address=${address}) on ${networkId}`,
          { cause }
        )
        return [pairKey, null]
      }
    })
  )

  return new Map(
    hotkeys.filter((result): result is [string, string] => typeof result[1] === "string")
  )
}

const fetchConvictionLockModes = async (
  connector: IChainConnectorDot,
  networkId: string,
  pairs: Array<Pick<ConvictionLockCandidate, "address" | "netuid">>,
  storageCoder: ReturnType<ReturnType<typeof parseMetadataRpc>["builder"]["buildStorage"]>
): Promise<Map<string, SubDTaoConvictionLockType>> => {
  const queries = pairs.map(
    ({ address, netuid }): RpcQueryPack<[string, SubDTaoConvictionLockType]> => {
      let stateKey: MaybeStateKey = null
      try {
        stateKey = storageCoder.keys.enc(address, netuid) as MaybeStateKey
      } catch (cause) {
        log.warn(
          `Failed to encode conviction DecayingLock key (netuid=${netuid}, address=${address}) on ${networkId}`,
          { cause }
        )
      }

      const key = convictionLockKey(address, netuid)

      return {
        stateKeys: [stateKey],
        decodeResult: (changes) => {
          const hexValue = changes[0]
          if (!hexValue) return [key, "decaying"]

          const decoded = decodeScale<boolean | null>(
            storageCoder,
            hexValue,
            `Failed to decode DecayingLock for (netuid=${netuid}, address=${address}) on ${networkId}`
          )

          return [key, decoded === false ? "perpetual" : "decaying"]
        },
      }
    }
  )

  return new Map(await fetchRpcQueryPack(connector, networkId, queries))
}

const fetchColdkeyLockStates = async (
  connector: IChainConnectorDot,
  networkId: string,
  metadataRpc: `0x${string}`,
  pairs: Array<Pick<ConvictionLockCandidate, "address" | "netuid">>
): Promise<Array<{ address: string; netuid: number; lockState: GetColdkeyLockResult }>> => {
  return Promise.all(
    pairs.map(async ({ address, netuid }) => {
      try {
        const lockState = await fetchRuntimeCallResult<GetColdkeyLockResult>(
          connector,
          networkId,
          metadataRpc,
          "StakeInfoRuntimeApi",
          "get_coldkey_lock",
          [address, netuid]
        )
        return { address, netuid, lockState }
      } catch (cause) {
        log.warn(
          `Failed to fetch get_coldkey_lock for (netuid=${netuid}, address=${address}) on ${networkId}`,
          { cause }
        )
        return { address, netuid, lockState: null }
      }
    })
  )
}

const buildStorageCoder = (metadataRpc: `0x${string}`, pallet: string, entry: string) => {
  const { builder } = parseMetadataRpc(metadataRpc)
  return builder.buildStorage(pallet, entry)
}
