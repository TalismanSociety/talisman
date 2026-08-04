import { BITTENSOR_NETWORK_ID } from "@core/domains/bittensor/exports"
import type { Address } from "@core/types/base"
import { type DotNetworkId, subNativeTokenId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAccountByAddress } from "@ui/state/accounts"
import { useToken } from "@ui/state/chaindata"
import { provideContext } from "@ui/util/provideContext"
import { useCallback, useMemo, useState } from "react"
import type { Hex } from "viem"

import { useBittensorClaimCandidates } from "../../hooks/useBittensorClaimCandidates"
import { useBittensorClaimPayload } from "../../hooks/useBittensorClaimPayload"
import { useSubtensorStorageBigInt } from "../../hooks/useSubtensorStorageBigInt"
import { ROOT_NETUID } from "../../utils/constants"
import { getBlockTimeMs } from "../../utils/helpers"
import { useBittensorClaimModal } from "./useBittensorClaimModal"

type WizardState = {
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

/** thresholds this high are the launch sentinel, not a real dust bound */
const CLAIMS_DISABLED_MIN_THRESHOLD = 1_000_000_000_000n // 1000 TAO

const useBittensorClaimWizardProvider = () => {
  const { args } = useBittensorClaimModal()
  const [{ networkId, address, hotkey, hash }, setWizardState] = useState<WizardState>(() => ({
    networkId: args?.networkId ?? BITTENSOR_NETWORK_ID,
    address: args?.address ?? null,
    hotkey: args?.hotkey ?? null,
    hash: null,
  }))

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
  const { data: rawDustThreshold, isSuccess: isDustThresholdReady } = useSubtensorStorageBigInt(
    sapi,
    "RootClaimableThreshold",
    [ROOT_NETUID]
  )
  const dustThreshold = rawDustThreshold ?? 0n

  // E2E-verified on testnet: with the sentinel default in place the claim extrinsic succeeds
  // but emits RootClaimed(tao=0) — a paid no-op the wizard must prevent
  const isClaimingDisabled = dustThreshold >= CLAIMS_DISABLED_MIN_THRESHOLD

  // claiming counts as a root stake op: when the hold window is enabled it restarts for
  // the claimed pair, so the user must be warned before confirming
  const { data: rawHoldInterval, isSuccess: isHoldIntervalReady } = useSubtensorStorageBigInt(
    sapi,
    "RootStakeUnlockInterval"
  )
  const holdIntervalBlocks = rawHoldInterval ?? 0n

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

  const onSubmitted = useCallback((txHash?: Hex) => {
    if (txHash) setWizardState((prev) => ({ ...prev, hash: txHash }))
  }, [])

  return {
    networkId,
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
    onSubmitted,
  }
}

export const [BittensorClaimWizardProvider, useBittensorClaimWizard] = provideContext(
  useBittensorClaimWizardProvider
)
