import { BITTENSOR_NETWORK_ID } from "@core/domains/bittensor/exports"
import { subNativeTokenId } from "@talismn/chaindata-provider"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useAccountByAddress } from "@ui/state/accounts"
import { useToken } from "@ui/state/chaindata"
import { provideContext } from "@ui/util/provideContext"
import { useCallback, useMemo, useState } from "react"
import type { Hex } from "viem"

import { useBittensorClaimablePlancks } from "../../hooks/useBittensorClaimablePlancks"
import { useBittensorClaimPayload } from "../../hooks/useBittensorClaimPayload"
import { useSubtensorStorageBigInt } from "../../hooks/useSubtensorStorageBigInt"
import type { BittensorClaimTarget } from "../../utils/claimableRewards"
import { ROOT_NETUID } from "../../utils/constants"
import { getBlockTimeMs } from "../../utils/helpers"
import { useBittensorClaimModal } from "./useBittensorClaimModal"

type WizardState = {
  /** frozen on open: the claim must never retarget another account or validator */
  target: BittensorClaimTarget | null
  hash: Hex | null
}

const useBittensorClaimWizardProvider = () => {
  const { args } = useBittensorClaimModal()
  const [{ target, hash }, setWizardState] = useState<WizardState>(() => ({
    target: args,
    hash: null,
  }))

  const networkId = target?.networkId ?? BITTENSOR_NETWORK_ID
  const nativeTokenId = useMemo(() => subNativeTokenId(networkId), [networkId])
  const nativeToken = useToken(nativeTokenId, "substrate-native")

  const account = useAccountByAddress(target?.address)

  // the entitlement can disappear while the modal is open (eg claimed from another device):
  // block instead of silently claiming something else
  const claimablePlancks = useBittensorClaimablePlancks(target)
  const isClaimUnavailable = claimablePlancks === null

  const { data: sapi } = useScaleApi(networkId)

  // claims below RootClaimableThreshold[ROOT] are skipped on-chain as dust: block them
  // instead of letting the user pay a fee for a no-op
  const { data: rawDustThreshold, isSuccess: isDustThresholdReady } = useSubtensorStorageBigInt(
    sapi,
    "RootClaimableThreshold",
    [ROOT_NETUID]
  )
  const dustThreshold = rawDustThreshold ?? 0n

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

  // the chain skips a claim below the threshold: it would succeed as a paid no-op
  // (E2E-verified on testnet: RootClaimed with 0 TAO). The launch value is unreachably high,
  // which is how the network keeps claims off until governance lowers it
  const isBelowDustThreshold =
    !!claimablePlancks && dustThreshold > 0n && claimablePlancks < dustThreshold

  // unresolved queries read as 0n, which would open the gate (and skip the hold warning)
  // while loading or on RPC error: hold submission until both reads have settled
  const canSubmit =
    !!account &&
    !isClaimUnavailable &&
    isDustThresholdReady &&
    isHoldIntervalReady &&
    !isBelowDustThreshold

  const {
    payload,
    txMetadata,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    isLoadingPayload,
  } = useBittensorClaimPayload({
    networkId: nativeToken?.networkId,
    address: target?.address,
    hotkey: target?.hotkey ?? null,
    enabled: canSubmit,
  })

  const onSubmitted = useCallback((txHash?: Hex) => {
    if (txHash) setWizardState((prev) => ({ ...prev, hash: txHash }))
  }, [])

  return {
    networkId,
    hash,
    account,
    hotkey: target?.hotkey ?? null,
    nativeToken,
    claimablePlancks: claimablePlancks ?? 0n,
    dustThreshold,
    isClaimUnavailable,
    isBelowDustThreshold,
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
