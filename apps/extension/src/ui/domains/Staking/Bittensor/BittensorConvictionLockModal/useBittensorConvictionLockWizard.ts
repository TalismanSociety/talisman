import { isAccountCompatibleWithNetwork } from "@core/domains/accounts/helpers"
import { TAO_DECIMALS } from "@talismn/balances"
import { type DotNetworkId, subDTaoTokenId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { useCombinedBittensorValidatorsData } from "@ui/domains/Staking/hooks/bittensor/useCombinedBittensorValidatorsData"
import { useSubnetTokens } from "@ui/domains/TaoDashboard/hooks/useSubnetTokens"
import { useAccounts } from "@ui/state/accounts"
import { useAppState } from "@ui/state/app"
import { useBalances } from "@ui/state/balances"
import { useDotNetwork, useToken } from "@ui/state/chaindata"
import { provideContext } from "@ui/util/provideContext"
import { shortenAddress } from "@ui/util/shortenAddress"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"

import type { ConvictionLockType } from "../components/BittensorLockTypePicker"
import { useBittensorConvictionLockModal } from "../hooks/useBittensorConvictionLockModal"
import { useBittensorConvictionLockPayload } from "../hooks/useBittensorConvictionLockPayload"
import { useBittensorCurrentLockType } from "../hooks/useBittensorCurrentLockType"
import { useBittensorFeeError } from "../hooks/useBittensorFeeError"
import { getDTaoSubnetUnstakeInfo } from "../utils/dtaoSubnetUnstakeInfo"
import { getBittensorErrorMessage } from "../utils/getBittensorErrorMessage"

export const BITTENSOR_LOCK_MODAL_CONTAINER_ID = "bittensor-conviction-lock-modal"

export type ConvictionLockWizardStep = "form" | "confirm" | "submitted"
export type ConvictionLockWizardPicker = "account" | "hotkey" | "lockType"

type WizardState = {
  step: ConvictionLockWizardStep
  activePicker: ConvictionLockWizardPicker | null
  networkId: DotNetworkId
  netuid: number
  address: string
  selectedHotkey: string | null
  /** TARGET total to lock, denominated in the subnet's alpha token */
  plancks: bigint | null
  /** target lock type; null = mirror the current on-chain lock type until the user picks a target */
  makePerpetual: boolean | null
  hash: Hex | null
}

const DEFAULT_STATE: WizardState = {
  step: "form",
  activePicker: null,
  networkId: "bittensor",
  netuid: 0,
  address: "",
  selectedHotkey: null,
  plancks: null,
  makePerpetual: null,
  hash: null,
}

/**
 * Conviction lock wizard: locks already-staked alpha on a subnet to a hotkey for governance
 * conviction. Steps: form → confirm → tx progress. Adapts to an existing lock (top-up, forced
 * hotkey) and offers a decaying/perpetual choice.
 */
const useBittensorConvictionLockWizardProvider = () => {
  const { t } = useTranslation()
  const { close, args } = useBittensorConvictionLockModal()

  const [
    {
      step,
      activePicker,
      networkId,
      netuid,
      address,
      selectedHotkey,
      plancks,
      makePerpetual,
      hash,
    },
    setWizardState,
  ] = useState<WizardState>(() =>
    // init with the params passed to the modal: the provider is remounted on each open
    // (keyed in the parent), so the lazy initializer re-reads them every time
    Object.assign(
      {},
      DEFAULT_STATE,
      args && {
        networkId: args.networkId,
        netuid: args.netuid,
        address: args.address ?? "",
        selectedHotkey: args.hotkey ?? null,
      }
    )
  )

  // intro drawer explaining conviction locks; shown over the form when the wizard first opens,
  // unless the user has dismissed it for good (lazy initializer re-reads the persisted flag on
  // each open, see above)
  const [hideConvictionLockInfo] = useAppState("hideBittensorConvictionLockInfo")
  const [showInfoDrawer, setShowInfoDrawer] = useState(() => !hideConvictionLockInfo)

  const accounts = useAccounts("owned")
  const network = useDotNetwork(networkId)
  const allBalances = useBalances("owned")

  // only already-staked alpha can be locked: restrict to accounts with stake on this subnet
  const eligibleAccounts = useMemo(() => {
    if (!network) return []
    return accounts.filter(
      (a) =>
        isAccountCompatibleWithNetwork(network, a) &&
        getDTaoSubnetUnstakeInfo(allBalances, a.address, networkId, netuid).stakedTotal > 0n
    )
  }, [accounts, allBalances, network, networkId, netuid])

  // keep a valid account selected
  useEffect(() => {
    if (!eligibleAccounts.length) return
    if (!address || !eligibleAccounts.some((a) => isAddressEqual(a.address, address)))
      setWizardState((prev) => ({ ...prev, address: eligibleAccounts[0].address }))
  }, [address, eligibleAccounts])

  const subnetUnstakeInfo = useMemo(
    () => (address ? getDTaoSubnetUnstakeInfo(allBalances, address, networkId, netuid) : null),
    [allBalances, address, networkId, netuid]
  )

  const existingLock = subnetUnstakeInfo?.convictionLock ?? null
  const existingLockAmount = existingLock?.amount ?? 0n
  const isTopUp = !!existingLock
  const { data: chainLockType, isLoading: isLoadingChainLockType } = useBittensorCurrentLockType({
    networkId,
    address: address || null,
    netuid,
  })
  const currentLockType =
    chainLockType ?? (isLoadingChainLockType ? null : (existingLock?.lockType ?? "decaying"))
  const currentIsPerpetual = currentLockType === null ? null : currentLockType === "perpetual"
  const targetLockType: ConvictionLockType | null =
    makePerpetual === null ? currentLockType : makePerpetual ? "perpetual" : "decaying"
  const targetIsPerpetual = targetLockType === "perpetual"
  const hasPerpetualLock = isTopUp && currentIsPerpetual === true
  const isLockTypeLoading = targetLockType === null
  // "available balance" is the account's full stake on the subnet; the amount field holds the TARGET
  // total to lock, which can be raised up to this ceiling
  const stakedTotal = subnetUnstakeInfo?.stakedTotal ?? 0n

  // the extrinsic needs the increase (lock_stake does locked_mass += amount), not the target total
  const lockDelta = typeof plancks === "bigint" ? plancks - existingLockAmount : null

  // a lock is keyed to one hotkey: the chain forces top-ups to reuse it, otherwise the user picks
  const effectiveHotkey = existingLock?.hotkey ?? selectedHotkey

  // pre-fill the amount with the current lock so the user can only increase it (top-up). The subnet
  // is fixed, so the lock changes only with the account: re-seed on account change, gated by address
  // identity so balance polls (which re-derive a decayed lock amount) never clobber an in-progress edit
  const refSeededAddress = useRef<string | null>(null)
  useEffect(() => {
    if (!address) return
    if (refSeededAddress.current === address) return
    refSeededAddress.current = address
    setWizardState((prev) => ({ ...prev, plancks: existingLock ? existingLock.amount : null }))
  }, [address, existingLock])

  const baseTokenId = useMemo(() => subDTaoTokenId(networkId, netuid), [networkId, netuid])
  const baseToken = useToken(baseTokenId, "substrate-dtao")
  const decimals = Number(baseToken?.decimals ?? TAO_DECIMALS)
  const symbol = `SN${netuid}`
  const subnetLabel = baseToken?.subnetName ? `${netuid} · ${baseToken.subnetName}` : symbol

  const { taoTokenId } = useSubnetTokens(netuid)

  const { combinedValidatorsData } = useCombinedBittensorValidatorsData(netuid)
  const hotkeyName = useMemo(() => {
    if (!effectiveHotkey) return null
    return (
      combinedValidatorsData.find((v) => isAddressEqual(v.hotkey, effectiveHotkey))?.name ||
      shortenAddress(effectiveHotkey, 6, 6)
    )
  }, [combinedValidatorsData, effectiveHotkey])

  const lockTypeLabel =
    targetLockType === null
      ? t("Loading…")
      : targetLockType === "perpetual"
        ? t("Perpetual Lock")
        : t("Decaying Lock")

  const { payload, txMetadata, feeEstimate, isLoadingFeeEstimate, errorFeeEstimate, errorPayload } =
    useBittensorConvictionLockPayload({
      networkId,
      address: address || null,
      hotkey: effectiveHotkey,
      netuid,
      amount: targetLockType ? lockDelta : null,
      makePerpetual: targetIsPerpetual,
      currentIsPerpetual,
      feeAmount: stakedTotal,
    })

  const payloadErrorMessage = useMemo(() => {
    const message = getBittensorErrorMessage(errorPayload)
    return message ? `${t("Failed to build transaction")}: ${message}` : null
  }, [errorPayload, t])

  const feeErrorMessage = useBittensorFeeError({
    allBalances,
    address: address || null,
    feeEstimate,
    feeTokenId: taoTokenId,
  })
  const submitErrorMessage = feeErrorMessage ?? payloadErrorMessage
  const payloadToSubmit = submitErrorMessage ? undefined : payload

  const errorMessage = useMemo(() => {
    if (stakedTotal <= 0n) return t("This account has no stake on this subnet")
    if (typeof plancks !== "bigint") return null
    if (isTopUp && plancks < existingLockAmount)
      return t("A lock can only be increased, not reduced")
    if (plancks > stakedTotal) return t("Amount exceeds your stake on this subnet")
    return null
  }, [stakedTotal, plancks, isTopUp, existingLockAmount, t])

  const canContinue =
    !!effectiveHotkey &&
    typeof lockDelta === "bigint" &&
    lockDelta > 0n &&
    typeof plancks === "bigint" &&
    plancks <= stakedTotal &&
    !!payloadToSubmit

  const setStep = useCallback((step: ConvictionLockWizardStep) => {
    setWizardState((prev) => ({ ...prev, step }))
  }, [])

  const setActivePicker = useCallback((activePicker: ConvictionLockWizardPicker | null) => {
    setWizardState((prev) => ({ ...prev, activePicker }))
  }, [])

  const setPlancks = useCallback((plancks: bigint | null) => {
    setWizardState((prev) => ({ ...prev, plancks }))
  }, [])

  const selectAccount = useCallback((address: string) => {
    // a different account may carry its own lock/hotkey/type constraints; the pre-fill effect
    // re-seeds the amount from the new account's existing lock (if any)
    setWizardState((prev) => ({
      ...prev,
      address,
      selectedHotkey: null,
      makePerpetual: null,
      activePicker: null,
    }))
  }, [])

  const selectHotkey = useCallback((hotkey: string) => {
    setWizardState((prev) => ({ ...prev, selectedHotkey: hotkey, activePicker: null }))
  }, [])

  const selectLockType = useCallback((lockType: ConvictionLockType) => {
    setWizardState((prev) => ({ ...prev, makePerpetual: lockType === "perpetual" }))
  }, [])

  const closeInfoDrawer = useCallback(() => setShowInfoDrawer(false), [])

  const onSubmitted = useCallback((hash: Hex) => {
    setWizardState((prev) => ({ ...prev, hash, step: "submitted" }))
  }, [])

  return {
    step,
    activePicker,
    networkId,
    netuid,
    address,
    plancks,
    makePerpetual,
    hash,
    showInfoDrawer,
    network,
    eligibleAccounts,
    existingLock,
    existingLockAmount,
    isTopUp,
    currentIsPerpetual,
    targetIsPerpetual,
    hasPerpetualLock,
    isLockTypeLoading,
    stakedTotal,
    lockDelta,
    effectiveHotkey,
    baseTokenId,
    decimals,
    symbol,
    subnetLabel,
    taoTokenId,
    hotkeyName,
    lockTypeLabel,
    errorMessage,
    feeErrorMessage,
    payloadErrorMessage,
    submitErrorMessage,
    canContinue,
    payload: payloadToSubmit,
    txMetadata,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    close,
    setStep,
    setActivePicker,
    setPlancks,
    selectAccount,
    selectHotkey,
    selectLockType,
    closeInfoDrawer,
    onSubmitted,
  }
}

export const [BittensorConvictionLockWizardProvider, useBittensorConvictionLockWizard] =
  provideContext(useBittensorConvictionLockWizardProvider)
