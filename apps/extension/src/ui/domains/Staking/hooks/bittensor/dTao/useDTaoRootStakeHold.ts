import { type Balance, findDTaoRootStakeHold } from "@talismn/balances"
import { type DotNetworkId, parseSubDTaoTokenId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { ROOT_NETUID } from "@ui/domains/Staking/Bittensor/utils/constants"
import { getBlockTimeMs } from "@ui/domains/Staking/Bittensor/utils/helpers"
import {
  getStorageDefault,
  getStorageItem,
  toBigIntStrict,
} from "@ui/domains/Staking/Bittensor/utils/storageDefault"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"
import { formatDuration, intervalToDuration } from "date-fns"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

const MIN_REFETCH_INTERVAL_MS = 3_000

// collision-free observation ids for pairEpoch — wall-clock time could repeat within a ms
let nextObservationId = 0

type DTaoRootStakeHold = {
  unlockAtBlock: number
  /** estimated ms until the hold expires; null until the current block is known */
  remainingMs: number | null
}

type DTaoRootStakeHoldCheck = {
  /** the active hold, or null when none is known */
  hold: DTaoRootStakeHold | null
  /**
   * false until the fresh chain read has resolved: the cached balance meta alone cannot
   * prove there is no hold (it lags the chain by one balances poll), so callers must
   * block submission while not ready (fail closed)
   */
  isReady: boolean
}

export type DTaoRootStakeHoldGate = {
  /** user-facing reason the hold blocks the flow, null when no hold is known */
  message: string | null
  /** true while submission must be blocked — including "not observed yet" (fail closed) */
  isBlocked: boolean
}

/** The (network, coldkey, hotkey) pair a root-stake balance is held against */
const getRootPair = (balance: Balance | null | undefined) => {
  if (!balance) return null
  try {
    const { netuid, hotkey } = parseSubDTaoTokenId(balance.tokenId)
    if (netuid !== ROOT_NETUID || !hotkey) return null
    return { networkId: balance.networkId as DotNetworkId, address: balance.address, hotkey }
  } catch {
    // not a dtao token: no root stake to hold
    return null
  }
}

/**
 * Root-stake hold window (spec 441): while active, the balance's root stake cannot leave
 * root — unstake/move/swap/transfer would fail with `RootStakeLocked`. Returns a null hold
 * for non-root balances; pass a null balance to disable (eg when the flow doesn't target
 * the position, such as staking more into root).
 *
 * The balance's hold meta lags the chain by one balances poll (~6s): a hold started just
 * now (a claim, or a stake from another device) would not be in it yet. The pair's
 * `LastColdkeyHotkeyStakeBlock` is also read fresh, and the later of the two unlock blocks
 * wins — the fresh read can only ever tighten the gate. Until that read first succeeds
 * `isReady` is false and callers must block submission: a null hold at that point only
 * means "not observed yet", not "no hold".
 */
const useDTaoRootStakeHold = (balance: Balance | null | undefined): DTaoRootStakeHoldCheck => {
  const pair = useMemo(() => getRootPair(balance), [balance])
  // pair is a fresh object on every balances poll: depend on whether there is one, not on it
  const hasPair = !!pair
  const cachedHold = useMemo(
    () => (hasPair ? findDTaoRootStakeHold(balance?.toJSON()) : null),
    [hasPair, balance]
  )

  // the epoch makes the query key unique per observation of a pair: TanStack retains even
  // a gcTime-0 cache entry while its fetch is in flight, so a plain pair key could serve
  // another observation's stale data on a quick A→B→A pair switch — with a hold that
  // started in between missing from it. Keyed on the pair's values, not the balance's
  // identity, which changes on every balances poll.
  const pairNetworkId = pair?.networkId
  const pairAddress = pair?.address
  const pairHotkey = pair?.hotkey
  const pairEpoch = useMemo(
    () =>
      pairNetworkId && pairAddress && pairHotkey
        ? `${pairNetworkId}|${pairAddress}|${pairHotkey}|${nextObservationId++}`
        : null,
    [pairNetworkId, pairAddress, pairHotkey]
  )

  const { data: sapi } = useScaleApi(pair?.networkId ?? null)
  const blockTimeMs = useMemo(() => (sapi ? getBlockTimeMs(sapi) : null), [sapi])
  const refetchInterval = Math.max(blockTimeMs ?? MIN_REFETCH_INTERVAL_MS, MIN_REFETCH_INTERVAL_MS)

  const { data: fresh } = useQuery({
    queryKey: ["useDTaoRootStakeHold", sapi?.chainId, pairEpoch],
    queryFn: async (): Promise<{
      unlockAtBlock: number | null
      currentBlock: number | null
    }> => {
      const none = { unlockAtBlock: null, currentBlock: null }
      if (!sapi || !pair) return none
      // older runtimes without the hold feature: skip the reads rather than throw
      if (!getStorageItem(sapi, "SubtensorModule", "RootStakeUnlockInterval")) return none

      // there is no setter extrinsic for the interval: enabling the hold can ship as a
      // runtime default that leaves the entry unset, so the metadata fallback must be read
      const [rawCurrentBlock, rawInterval] = await Promise.all([
        sapi.getStorage<number>("System", "Number", []),
        sapi.getStorage<bigint>("SubtensorModule", "RootStakeUnlockInterval", []),
      ])
      const currentBlock = typeof rawCurrentBlock === "number" ? rawCurrentBlock : null
      const interval =
        rawInterval != null
          ? toBigIntStrict(rawInterval)
          : getStorageDefault(sapi, "SubtensorModule", "RootStakeUnlockInterval")
      if (interval === 0n) return { unlockAtBlock: null, currentBlock }

      const lastStakeBlock = await sapi.getStorage<bigint>(
        "SubtensorModule",
        "LastColdkeyHotkeyStakeBlock",
        [pair.address, pair.hotkey]
      )
      if (lastStakeBlock == null) return { unlockAtBlock: null, currentBlock }

      const unlockAtBlock = Number(toBigIntStrict(lastStakeBlock) + interval)
      // an unknown current block cannot prove the hold expired: keep it (fail tight)
      return {
        unlockAtBlock: currentBlock === null || unlockAtBlock > currentBlock ? unlockAtBlock : null,
        currentBlock,
      }
    },
    enabled: !!sapi && !!pair,
    refetchInterval,
    // epochs are never revisited: drop their entries as soon as they stop being observed
    gcTime: 0,
  })

  const hold = useMemo(() => {
    // the later unlock block wins: cached meta may lag a hold that just started, the fresh
    // read may fail transiently — neither can loosen the other
    const unlockAtBlock =
      Math.max(cachedHold?.unlockAtBlock ?? 0, fresh?.unlockAtBlock ?? 0) || null
    if (!unlockAtBlock) return null
    if (typeof fresh?.currentBlock !== "number" || !blockTimeMs)
      return { unlockAtBlock, remainingMs: null }
    const remainingBlocks = unlockAtBlock - fresh.currentBlock
    // expired since the last balances poll: the chain no longer restricts the pair
    if (remainingBlocks <= 0) return null
    return { unlockAtBlock, remainingMs: remainingBlocks * blockTimeMs }
  }, [cachedHold, fresh, blockTimeMs])

  // readiness comes from data presence, not isSuccess: a failed background refetch flips
  // isSuccess but keeps the last data, and with gcTime 0 data resets on a pair change —
  // so readiness only drops when the current pair has never been read successfully
  return useMemo(() => ({ hold, isReady: !hasPair || fresh !== undefined }), [hold, hasPair, fresh])
}

/** User-facing explanation of an active hold, ready to use as a form error message */
const useDTaoRootStakeHoldMessage = (hold: DTaoRootStakeHold | null): string | null => {
  const { t } = useTranslation()
  const locale = useDateFnsLocale()

  return useMemo(() => {
    if (!hold) return null
    if (!hold.remainingMs) return t("Root stake is temporarily locked after staking or claiming")
    const duration = formatDuration(intervalToDuration({ start: 0, end: hold.remainingMs }), {
      locale,
    })
    return t("Root stake is locked for {{duration}} after staking or claiming", { duration })
  }, [hold, t, locale])
}

/**
 * Submission gate for flows that would move root stake out of root. `isBlocked` also covers
 * the not-yet-observed case, so every flow fails closed from one place — a caller that only
 * checks `message` would let a just-started hold through while the first read is in flight.
 */
export const useDTaoRootStakeHoldGate = (
  balance: Balance | null | undefined
): DTaoRootStakeHoldGate => {
  const { hold, isReady } = useDTaoRootStakeHold(balance)
  const message = useDTaoRootStakeHoldMessage(hold)

  return useMemo(() => ({ message, isBlocked: !!message || !isReady }), [message, isReady])
}
