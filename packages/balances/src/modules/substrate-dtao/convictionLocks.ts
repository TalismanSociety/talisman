import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { decodeScale, type MetadataBuilder, type ScaleStorageCoder } from "@talismn/scale"

import log from "../../log"
import { fetchRuntimeCallResult, hasRuntimeApi, hasStorageItems } from "../shared"
import { parseMetadataRpcCached } from "../shared/parseMetadataRpcCached"
import { fetchRpcQueryPack, type MaybeStateKey, type RpcQueryPack } from "../shared/rpcQueryPack"
import type {
  GetColdkeyLockResult,
  SubDTaoBalanceMeta,
  SubDTaoConvictionLock,
  SubDTaoConvictionLockType,
} from "./types"

/** A decoded SubtensorModule.Lock storage key: (coldkey, netuid, hotkey) */
type ConvictionLockStorageKey = {
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
 * The locked amount cannot be unstaked until the lock decays (or ever, if perpetual);
 * transferring it is allowed but moves the lock and its conviction to the recipient.
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

/**
 * Coerces a dynamically-decoded numeric field to bigint. Fixed-point newtypes (eg the U64F64
 * conviction) decode as a plain bigint when the builder unwraps the wrapper struct, or as
 * `{ bits }` when it doesn't — accept both; anything else is 0n.
 */
export const toBigIntValue = (value: unknown): bigint => {
  if (typeof value === "bigint") return value
  if (value && typeof value === "object" && "bits" in value) {
    const bits = (value as { bits: unknown }).bits
    if (typeof bits === "bigint") return bits
  }
  return 0n
}

/**
 * Fetches Bittensor conviction locks (SubtensorModule.Lock) for the given coldkey addresses.
 *
 * On-chain, a lock constrains the coldkey's TOTAL alpha on the subnet across all of its hotkeys
 * (available_to_unstake = Σ stakes - locked_mass), with at most one locked hotkey per (coldkey, netuid).
 * The lock is reported with the hotkey it is keyed on (used for conviction credit and lock top-ups),
 * and is attached to the subnet's base token balance rather than to a staking position.
 *
 * Locks are discovered with one storage prefix scan per coldkey, independently of staking positions:
 * the chain keeps a zero-mass Lock entry alive while it still carries conviction ("ghost" lock),
 * even after the coldkey fully unstaked from the subnet.
 */
export const fetchConvictionLocks = async (
  connector: IChainConnectorDot,
  networkId: string,
  metadataRpc: `0x${string}`,
  addresses: string[]
): Promise<FetchedConvictionLock[]> => {
  if (!addresses.length) return []

  const { unifiedMetadata, builder } = parseMetadataRpcCached(metadataRpc)
  if (
    !hasRuntimeApi(unifiedMetadata, "StakeInfoRuntimeApi", "get_coldkey_lock") ||
    !hasStorageItems(unifiedMetadata, "SubtensorModule", ["Lock", "DecayingLock"])
  ) {
    return []
  }

  try {
    const lockStorageCoder = builder.buildStorage("SubtensorModule", "Lock")
    const decayingLockStorageCoder = builder.buildStorage("SubtensorModule", "DecayingLock")

    const lockStorageKeys = await fetchConvictionLockStorageKeys(
      connector,
      networkId,
      addresses,
      lockStorageCoder
    )
    if (!lockStorageKeys.length) return []

    const hotkeyByPair = new Map(
      lockStorageKeys.map(({ address, netuid, hotkey }) => [
        convictionLockKey(address, netuid),
        hotkey,
      ])
    )

    const [lockModesByPair, lockStates] = await Promise.all([
      fetchConvictionLockModes(connector, networkId, lockStorageKeys, decayingLockStorageCoder),
      fetchColdkeyLockStates(connector, networkId, builder, lockStorageKeys),
    ])

    return lockStates.flatMap(({ address, netuid, lockState }) => {
      const amount = lockState?.locked_mass ?? 0n
      const convictionRaw = toBigIntValue(lockState?.conviction)
      // keep zero-mass locks that still carry conviction ("ghost" locks): the chain keeps the
      // Lock entry alive and pins future lock_stake calls to its hotkey (LockHotkeyMismatch)
      if (amount <= 0n && convictionRaw <= 0n) return []

      const hotkey = hotkeyByPair.get(convictionLockKey(address, netuid))
      if (!hotkey) return []

      return [
        {
          address,
          netuid,
          lock: {
            amount,
            hotkey,
            lockType: lockModesByPair.get(convictionLockKey(address, netuid)) ?? "decaying",
            convictionRaw: convictionRaw.toString(),
          },
        },
      ]
    })
  } catch (cause) {
    // propagate instead of returning []: an empty result reads as "no locks", the provider
    // deletes the stored lock-only balances, and the rows flap back in on the next
    // successful poll. Throwing fails the whole poll so those balances go stale instead
    log.warn(`Failed to fetch Bittensor conviction locks on ${networkId}`, { cause })
    throw cause
  }
}

/**
 * Discovers all Lock entries of the given coldkeys, with one storage prefix scan per coldkey.
 * Encoding only the first map key (the coldkey) yields the storage key prefix covering all of the
 * coldkey's (netuid, hotkey) entries, using the hashers declared in metadata.
 */
const fetchConvictionLockStorageKeys = async (
  connector: IChainConnectorDot,
  networkId: string,
  addresses: string[],
  storageCoder: ScaleStorageCoder
): Promise<ConvictionLockStorageKey[]> => {
  const keysPerAddress = await Promise.all(
    addresses.map(async (address): Promise<ConvictionLockStorageKey[]> => {
      let keyPrefix: string
      try {
        keyPrefix = storageCoder.keys.enc(address)
      } catch (cause) {
        log.warn(
          `Failed to encode conviction Lock key prefix (address=${address}) on ${networkId}`,
          { cause }
        )
        return []
      }

      let stateKeys: `0x${string}`[]
      try {
        stateKeys = await connector.send<`0x${string}`[]>(networkId, "state_getKeys", [keyPrefix])
      } catch (cause) {
        // transient RPC failure: swallowing it would make every lock of this address read
        // as removed for one poll (delete + re-add flap downstream) — fail the poll instead
        log.warn(`Failed to fetch conviction Lock keys (address=${address}) on ${networkId}`, {
          cause,
        })
        throw cause
      }

      return stateKeys.flatMap((stateKey) => {
        try {
          const [, netuid, hotkey] = storageCoder.keys.dec(stateKey) as [string, number, string]
          // report the lock under the requested address (the prefix guarantees it is the
          // coldkey) to keep the address format consistent with the rest of the pipeline
          return [{ address, netuid, hotkey }]
        } catch (cause) {
          // a returned state key that fails decode is a bad response (or metadata drift),
          // not an absent lock — fail the poll (stale) instead of silently dropping it
          log.warn(`Failed to decode conviction Lock key ${stateKey} on ${networkId}`, { cause })
          throw cause
        }
      })
    })
  )

  return keysPerAddress.flat()
}

const fetchConvictionLockModes = async (
  connector: IChainConnectorDot,
  networkId: string,
  pairs: Array<Pick<ConvictionLockStorageKey, "address" | "netuid">>,
  storageCoder: ScaleStorageCoder
): Promise<Map<string, SubDTaoConvictionLockType>> => {
  const queries = pairs.map(
    ({ address, netuid }): RpcQueryPack<[string, SubDTaoConvictionLockType]> => {
      let stateKey: MaybeStateKey
      try {
        stateKey = storageCoder.keys.enc(address, netuid) as MaybeStateKey
      } catch (cause) {
        // an unencodable key (metadata drift) would silently default the pair to "decaying"
        // below, mislabeling a perpetual lock — fail the poll instead, like decode failures
        log.warn(
          `Failed to encode conviction DecayingLock key (netuid=${netuid}, address=${address}) on ${networkId}`,
          { cause }
        )
        throw cause
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
          // present-but-undecodable: defaulting to "decaying" would mislabel a perpetual lock
          if (decoded === null)
            throw new Error(
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
  builder: MetadataBuilder,
  pairs: Array<Pick<ConvictionLockStorageKey, "address" | "netuid">>
): Promise<Array<{ address: string; netuid: number; lockState: GetColdkeyLockResult }>> => {
  return Promise.all(
    pairs.map(async ({ address, netuid }) => {
      try {
        const lockState = await fetchRuntimeCallResult<GetColdkeyLockResult>(
          connector,
          networkId,
          builder,
          "StakeInfoRuntimeApi",
          "get_coldkey_lock",
          [address, netuid]
        )
        return { address, netuid, lockState }
      } catch (cause) {
        // a null lockState decodes as zero mass + zero conviction and the lock is silently
        // dropped — transient RPC failures must fail the poll, not erase the lock
        log.warn(
          `Failed to fetch get_coldkey_lock for (netuid=${netuid}, address=${address}) on ${networkId}`,
          { cause }
        )
        throw cause
      }
    })
  )
}
