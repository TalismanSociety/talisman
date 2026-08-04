import { BITTENSOR_NETWORK_ID } from "@core/domains/bittensor/exports"
import type { Address } from "@core/types/base"
import { type DotNetworkId, subNativeTokenId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import type { ScaleApi } from "@talismn/sapi"
import { useQuery } from "@tanstack/react-query"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useAccountByAddress } from "@ui/state/accounts"
import { useToken } from "@ui/state/chaindata"
import { provideContext } from "@ui/util/provideContext"
import { useCallback, useMemo, useState } from "react"
import { BehaviorSubject } from "rxjs"
import type { Hex } from "viem"

import { useBittensorClaimPayload } from "../../hooks/useBittensorClaimPayload"
import {
  type BittensorStakingPosition,
  useBittensorStakingPositions,
} from "../../hooks/useBittensorStakingPositions"
import { getBalanceClaimablePlancks } from "../../utils/claimableRewards"
import { ROOT_NETUID } from "../../utils/constants"

export type BittensorClaimStep = "review" | "follow-up"

export type BittensorClaimCandidate = {
  position: BittensorStakingPosition
  claimablePlancks: bigint
}

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
  const positionPicker = useOpenClose()

  // the claim targets an existing root staking position: candidates are the root positions
  // whose balance carries claimable rewards, biggest claim first. (The base token's claimable
  // remainder - entitlement on fully-unstaked validators - has no hotkey attribution and
  // cannot be claimed here.)
  const positions = useBittensorStakingPositions(networkId)
  const candidates = useMemo<BittensorClaimCandidate[]>(
    () =>
      positions
        .filter((p) => p.token.netuid === ROOT_NETUID && !!p.token.hotkey)
        .map((position) => ({
          position,
          claimablePlancks: getBalanceClaimablePlancks(position.balance),
        }))
        .filter((c) => c.claimablePlancks > 0n)
        .sort((a, b) => (a.claimablePlancks > b.claimablePlancks ? -1 : 1)),
    [positions]
  )

  // fall back to the biggest claim when no position was preselected (eg toolbar entry)
  const selectedCandidate = useMemo(
    () =>
      (address && hotkey
        ? candidates.find(
            (c) =>
              c.position.token.hotkey === hotkey &&
              isAddressEqual(c.position.balance.address, address)
          )
        : undefined) ??
      candidates[0] ??
      null,
    [candidates, address, hotkey]
  )

  const account = useAccountByAddress(selectedCandidate?.position.balance.address)
  const claimablePlancks = selectedCandidate?.claimablePlancks ?? 0n

  const { data: sapi } = useScaleApi(networkId)

  // claims below RootClaimableThreshold[ROOT] are skipped on-chain as dust: block them
  // instead of letting the user pay a fee for a no-op
  const { data: rawDustThreshold } = useQuery({
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
  // the claimed pair, so the user must be warned before confirming
  const { data: rawHoldInterval } = useQuery({
    queryKey: ["bittensorRootStakeUnlockInterval", sapi?.id],
    queryFn: () => sapi?.getStorage("SubtensorModule", "RootStakeUnlockInterval", []),
    enabled: !!sapi,
  })
  const holdIntervalBlocks = toBigInt(rawHoldInterval)

  const isBelowDustThreshold =
    claimablePlancks > 0n && dustThreshold > 0n && claimablePlancks < dustThreshold

  const canSubmit = !!account && !!selectedCandidate && !isBelowDustThreshold && !isClaimingDisabled

  const {
    payload,
    txMetadata,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    isLoadingPayload,
  } = useBittensorClaimPayload({
    networkId: nativeToken?.networkId,
    address: selectedCandidate?.position.balance.address,
    hotkey: selectedCandidate?.position.token.hotkey ?? null,
    enabled: canSubmit,
  })

  const setStep = useCallback(
    (newStep: BittensorClaimStep) => setWizardState((prev) => ({ ...prev, step: newStep })),
    []
  )

  const setCandidate = useCallback(
    (candidate: BittensorClaimCandidate) =>
      setWizardState((prev) => ({
        ...prev,
        address: candidate.position.balance.address,
        hotkey: candidate.position.token.hotkey ?? null,
      })),
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
    candidates,
    selectedCandidate,
    positionPicker,
    claimablePlancks,
    dustThreshold,
    isBelowDustThreshold,
    isClaimingDisabled,
    holdIntervalBlocks,
    canSubmit,
    payload,
    txMetadata,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    isLoadingPayload,
    setStep,
    setCandidate,
    onSubmitted,
  }
}

export const [BittensorClaimWizardProvider, useBittensorClaimWizard] = provideContext(
  useBittensorClaimWizardProvider
)
