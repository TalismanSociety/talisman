import { BITTENSOR_NETWORK_ID } from "@core/domains/bittensor/exports"
import type { Address } from "@core/types/base"
import { type DotNetworkId, subNativeTokenId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import type { ScaleApi } from "@talismn/sapi"
import { useQuery } from "@tanstack/react-query"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAccountByAddress } from "@ui/state/accounts"
import { useToken } from "@ui/state/chaindata"
import { provideContext } from "@ui/util/provideContext"
import { useCallback, useMemo, useState } from "react"
import { BehaviorSubject } from "rxjs"
import type { Hex } from "viem"

import { useBittensorClaimCandidates } from "../../hooks/useBittensorClaimCandidates"
import { useBittensorClaimPayload } from "../../hooks/useBittensorClaimPayload"
import { ROOT_NETUID } from "../../utils/constants"
import { getBlockTimeMs } from "../../utils/helpers"

export type BittensorClaimStep = "review" | "follow-up"

type WizardState = {
  step: BittensorClaimStep
  networkId: DotNetworkId
  address: Address | null
  /** validator whose basket entitlement to claim */
  hotkey: string | null
  hash: Hex | null
}

export type BittensorClaimOpenOptions = {
  networkId: DotNetworkId
  address?: Address
  /** preselected validator (eg opened from its position row); defaults to the biggest claim */
  hotkey?: string
}

const DEFAULT_STATE: WizardState = {
  step: "review",
  networkId: BITTENSOR_NETWORK_ID,
  address: null,
  hotkey: null,
  hash: null,
}

const wizardOpenState$ = new BehaviorSubject(DEFAULT_STATE)

export const useResetBittensorClaimWizard = () => {
  const reset = useCallback((init: BittensorClaimOpenOptions) => {
    wizardOpenState$.next({
      ...DEFAULT_STATE,
      networkId: init.networkId,
      address: init.address ?? null,
      hotkey: init.hotkey ?? null,
    })
  }, [])

  return reset
}

/** storage values decode as bigint (u64) but guard against number decodes */
const toBigInt = (value: unknown): bigint =>
  typeof value === "bigint" ? value : typeof value === "number" ? BigInt(value) : 0n

/**
 * An absent storage entry means the chain applies the metadata default, so reads must too.
 * Root Reborn ships `RootClaimableThreshold` unset with a sentinel default (~2.1M TAO) that
 * dust-skips every claim: claiming stays disabled network-wide until governance sets it.
 */
const getStorageDefault = (sapi: ScaleApi, pallet: string, entry: string): bigint | null => {
  try {
    const item = sapi.chain.metadata.pallets
      .find((p) => p.name === pallet)
      ?.storage?.items.find((i) => i.name === entry)
    if (!item?.fallback) return null
    const coder = sapi.chain.builder.buildStorage(pallet, entry)
    return toBigInt(coder.value.dec(item.fallback))
  } catch {
    return null
  }
}

/** thresholds this high are the launch sentinel, not a real dust bound */
const CLAIMS_DISABLED_MIN_THRESHOLD = 1_000_000_000_000n // 1000 TAO

const useBittensorClaimWizardProvider = () => {
  const [{ networkId, address, hotkey, step, hash }, setWizardState] = useState(() =>
    wizardOpenState$.getValue()
  )

  const nativeTokenId = useMemo(() => subNativeTokenId(networkId), [networkId])
  const nativeToken = useToken(nativeTokenId, "substrate-native")

  const candidates = useBittensorClaimCandidates(networkId)

  // fall back to the biggest claim when no position was preselected (eg toolbar entry)
  const selectedCandidate = useMemo(
    () =>
      (address && hotkey
        ? candidates.find(
            (c) => c.token.hotkey === hotkey && isAddressEqual(c.balance.address, address)
          )
        : undefined) ??
      candidates[0] ??
      null,
    [candidates, address, hotkey]
  )

  const account = useAccountByAddress(selectedCandidate?.balance.address)
  const claimablePlancks = selectedCandidate?.claimablePlancks ?? 0n

  const { data: sapi } = useScaleApi(networkId)

  // claims below RootClaimableThreshold[ROOT] are skipped on-chain as dust: block them
  // instead of letting the user pay a fee for a no-op
  const { data: rawDustThreshold, isSuccess: isDustThresholdReady } = useQuery({
    queryKey: ["bittensorRootClaimableThreshold", sapi?.id],
    queryFn: async () => {
      if (!sapi) return null
      const value = await sapi.getStorage<bigint>("SubtensorModule", "RootClaimableThreshold", [
        ROOT_NETUID,
      ])
      return value ?? getStorageDefault(sapi, "SubtensorModule", "RootClaimableThreshold")
    },
    enabled: !!sapi,
  })
  const dustThreshold = toBigInt(rawDustThreshold)

  // E2E-verified on testnet: with the sentinel default in place the claim extrinsic succeeds
  // but emits RootClaimed(tao=0) — a paid no-op the wizard must prevent
  const isClaimingDisabled = dustThreshold >= CLAIMS_DISABLED_MIN_THRESHOLD

  // claiming counts as a root stake op: when the hold window is enabled it restarts for
  // the claimed pair, so the user must be warned before confirming. There is no setter
  // extrinsic for this storage: enabling it may come as a runtime default with the entry
  // left unset, so the metadata fallback must be read too.
  const { data: rawHoldInterval, isSuccess: isHoldIntervalReady } = useQuery({
    queryKey: ["bittensorRootStakeUnlockInterval", sapi?.id],
    queryFn: async () => {
      if (!sapi) return null
      const value = await sapi.getStorage<bigint>("SubtensorModule", "RootStakeUnlockInterval", [])
      return value ?? getStorageDefault(sapi, "SubtensorModule", "RootStakeUnlockInterval")
    },
    enabled: !!sapi,
  })
  const holdIntervalBlocks = toBigInt(rawHoldInterval)

  const holdDurationMs = useMemo(
    () =>
      sapi && holdIntervalBlocks > 0n ? Number(holdIntervalBlocks) * getBlockTimeMs(sapi) : null,
    [sapi, holdIntervalBlocks]
  )

  const isBelowDustThreshold =
    claimablePlancks > 0n && dustThreshold > 0n && claimablePlancks < dustThreshold

  // unresolved queries read as 0n, which would open the gate (and skip the hold warning)
  // while loading or on RPC error: hold submission until both reads have settled
  const canSubmit =
    !!account &&
    !!selectedCandidate &&
    isDustThresholdReady &&
    isHoldIntervalReady &&
    !isBelowDustThreshold &&
    !isClaimingDisabled

  const {
    payload,
    txMetadata,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    isLoadingPayload,
  } = useBittensorClaimPayload({
    networkId: nativeToken?.networkId,
    address: selectedCandidate?.balance.address,
    hotkey: selectedCandidate?.token.hotkey ?? null,
    enabled: canSubmit,
  })

  const setStep = useCallback(
    (newStep: BittensorClaimStep) => setWizardState((prev) => ({ ...prev, step: newStep })),
    []
  )

  const onSubmitted = useCallback((txHash?: Hex) => {
    if (txHash) setWizardState((prev) => ({ ...prev, step: "follow-up", hash: txHash }))
  }, [])

  return {
    networkId,
    step,
    hash,
    account,
    nativeToken,
    selectedCandidate,
    claimablePlancks,
    dustThreshold,
    isBelowDustThreshold,
    isClaimingDisabled,
    holdDurationMs,
    canSubmit,
    payload,
    txMetadata,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    isLoadingPayload,
    setStep,
    onSubmitted,
  }
}

export const [BittensorClaimWizardProvider, useBittensorClaimWizard] = provideContext(
  useBittensorClaimWizardProvider
)
