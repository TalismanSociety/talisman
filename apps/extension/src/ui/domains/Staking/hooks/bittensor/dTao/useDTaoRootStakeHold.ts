import { type Balance, findDTaoRootStakeHold } from "@talismn/balances"
import type { DotNetworkId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
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

export type DTaoRootStakeHold = {
  unlockAtBlock: number
  /** estimated ms until the hold expires; null until the current block is known */
  remainingMs: number | null
}

/**
 * Root-stake hold window (spec 441): while active, the balance's root stake cannot leave
 * root — unstake/move/swap/transfer would fail with `RootStakeLocked`. Pass a null balance
 * to disable (eg when the flow doesn't target a root position).
 *
 * The balance's hold meta lags the chain by one balances poll (~6s): a hold started just
 * now (a claim, or a stake from another device) would not be in it yet. When address and
 * hotkey are provided the pair's `LastColdkeyHotkeyStakeBlock` is also read fresh, and the
 * later of the two unlock blocks wins — the fresh read can only ever tighten the gate.
 */
export const useDTaoRootStakeHold = ({
  networkId,
  balance,
  address,
  hotkey,
}: {
  networkId: DotNetworkId | null | undefined
  balance: Balance | null | undefined
  address: string | null | undefined
  hotkey: string | null | undefined
}): DTaoRootStakeHold | null => {
  const cachedHold = useMemo(() => findDTaoRootStakeHold(balance?.toJSON()), [balance])

  const { data: sapi } = useScaleApi(balance ? networkId : null)
  const blockTimeMs = useMemo(() => (sapi ? getBlockTimeMs(sapi) : null), [sapi])
  const refetchInterval = Math.max(blockTimeMs ?? MIN_REFETCH_INTERVAL_MS, MIN_REFETCH_INTERVAL_MS)

  const { data: freshUnlockAtBlock } = useQuery({
    queryKey: ["useDTaoRootStakeHoldFresh", sapi?.chainId, address, hotkey],
    queryFn: async () => {
      if (!sapi || !address || !hotkey) return null
      // older runtimes without the hold feature: skip the reads rather than throw
      if (!getStorageItem(sapi, "SubtensorModule", "RootStakeUnlockInterval")) return null

      // there is no setter extrinsic for the interval: enabling the hold can ship as a
      // runtime default that leaves the entry unset, so the metadata fallback must be read
      const rawInterval = await sapi.getStorage<bigint>(
        "SubtensorModule",
        "RootStakeUnlockInterval",
        []
      )
      const interval =
        rawInterval != null
          ? toBigIntStrict(rawInterval)
          : getStorageDefault(sapi, "SubtensorModule", "RootStakeUnlockInterval")
      if (interval === 0n) return null

      const lastStakeBlock = await sapi.getStorage<bigint>(
        "SubtensorModule",
        "LastColdkeyHotkeyStakeBlock",
        [address, hotkey]
      )
      if (lastStakeBlock == null) return null

      const unlockAtBlock = Number(toBigIntStrict(lastStakeBlock) + interval)
      const currentBlock = await sapi.getStorage<number>("System", "Number", [])
      return typeof currentBlock === "number" && unlockAtBlock > currentBlock ? unlockAtBlock : null
    },
    enabled: !!sapi && !!balance && !!address && !!hotkey,
    refetchInterval,
  })

  // the later unlock block wins: cached meta may lag a hold that just started, the fresh
  // read may fail transiently — neither can loosen the other
  const unlockAtBlock = useMemo(
    () => Math.max(cachedHold?.unlockAtBlock ?? 0, freshUnlockAtBlock ?? 0) || null,
    [cachedHold, freshUnlockAtBlock]
  )

  const { data: currentBlock } = useQuery({
    queryKey: ["useDTaoRootStakeHold", sapi?.chainId, unlockAtBlock],
    queryFn: () => sapi?.getStorage<number>("System", "Number", []) ?? null,
    enabled: !!sapi && !!unlockAtBlock,
    refetchInterval,
  })

  return useMemo(() => {
    if (!unlockAtBlock) return null
    if (typeof currentBlock !== "number" || !blockTimeMs)
      return { unlockAtBlock, remainingMs: null }
    const remainingBlocks = unlockAtBlock - currentBlock
    // expired since the last balances poll: the chain no longer restricts the pair
    if (remainingBlocks <= 0) return null
    return { unlockAtBlock, remainingMs: remainingBlocks * blockTimeMs }
  }, [unlockAtBlock, currentBlock, blockTimeMs])
}

/** User-facing explanation of an active hold, ready to use as a form error message */
export const useDTaoRootStakeHoldMessage = (hold: DTaoRootStakeHold | null): string | null => {
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
