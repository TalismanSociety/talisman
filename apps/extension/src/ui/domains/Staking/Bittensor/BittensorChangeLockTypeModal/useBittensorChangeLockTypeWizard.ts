import { isAccountCompatibleWithNetwork } from "@core/domains/accounts/helpers"
import { type DotNetworkId, subDTaoTokenId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { useCombinedBittensorValidatorsData } from "@ui/domains/Staking/hooks/bittensor/useCombinedBittensorValidatorsData"
import { useSubnetTokens } from "@ui/domains/TaoDashboard/hooks/useSubnetTokens"
import { useAccounts } from "@ui/state/accounts"
import { useBalances } from "@ui/state/balances"
import { useDotNetwork, useToken } from "@ui/state/chaindata"
import { provideContext } from "@ui/util/provideContext"
import { shortenAddress } from "@ui/util/shortenAddress"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { Hex } from "viem"

import type { ConvictionLockType } from "../components/BittensorLockTypePicker"
import { useBittensorChangeLockTypeModal } from "../hooks/useBittensorChangeLockTypeModal"
import { useBittensorChangeLockTypePayload } from "../hooks/useBittensorChangeLockTypePayload"
import { useBittensorFeeError } from "../hooks/useBittensorFeeError"
import { getDTaoSubnetUnstakeInfo } from "../utils/dtaoSubnetUnstakeInfo"

export const BITTENSOR_CHANGE_LOCK_TYPE_MODAL_CONTAINER_ID = "bittensor-change-lock-type-modal"

export type ChangeLockTypeWizardStep = "form" | "confirm" | "submitted"
export type ChangeLockTypeWizardPicker = "account" | "lockType"

type WizardState = {
  step: ChangeLockTypeWizardStep
  activePicker: ChangeLockTypeWizardPicker | null
  networkId: DotNetworkId
  netuid: number
  address: string
  /** target lock type; null = mirror the current lock type until the user picks a target */
  makePerpetual: boolean | null
  hash: Hex | null
}

const DEFAULT_STATE: WizardState = {
  step: "form",
  activePicker: null,
  networkId: "bittensor",
  netuid: 0,
  address: "",
  makePerpetual: null,
  hash: null,
}

/**
 * Change-lock-type wizard: toggles an existing conviction lock between decaying and perpetual
 * via `SubtensorModule.set_perpetual_lock`. Steps: form → confirm → tx progress. The lock's
 * hotkey and amount are fixed — only the decay flag changes, and the flip is reversible.
 */
const useBittensorChangeLockTypeWizardProvider = () => {
  const { close, args } = useBittensorChangeLockTypeModal()

  const [{ step, activePicker, networkId, netuid, address, makePerpetual, hash }, setWizardState] =
    useState<WizardState>(() =>
      // init with the params passed to the modal: the provider is remounted on each open
      // (keyed in the parent), so the lazy initializer re-reads them every time
      Object.assign(
        {},
        DEFAULT_STATE,
        args && {
          networkId: args.networkId,
          netuid: args.netuid,
          address: args.address ?? "",
        }
      )
    )

  const accounts = useAccounts("owned")
  const network = useDotNetwork(networkId)
  const allBalances = useBalances("owned")

  // only existing locks can be toggled: restrict to accounts with a conviction lock on this subnet
  const eligibleAccounts = useMemo(() => {
    if (!network) return []
    return accounts.filter(
      (a) =>
        isAccountCompatibleWithNetwork(network, a) &&
        !!getDTaoSubnetUnstakeInfo(allBalances, a.address, networkId, netuid).convictionLock
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
  const currentIsPerpetual = existingLock?.lockType === "perpetual"
  // target type: user choice once set, else mirror current
  const targetIsPerpetual = makePerpetual ?? currentIsPerpetual
  const isNoop = targetIsPerpetual === currentIsPerpetual

  const baseTokenId = useMemo(() => subDTaoTokenId(networkId, netuid), [networkId, netuid])
  const baseToken = useToken(baseTokenId, "substrate-dtao")
  const symbol = `SN${netuid}`
  const subnetLabel = baseToken?.subnetName ? `${netuid} · ${baseToken.subnetName}` : symbol

  const { taoTokenId } = useSubnetTokens(netuid)

  const { combinedValidatorsData } = useCombinedBittensorValidatorsData(netuid)
  const hotkeyName = useMemo(() => {
    if (!existingLock?.hotkey) return null
    return (
      combinedValidatorsData.find((v) => v.hotkey === existingLock.hotkey)?.name ||
      shortenAddress(existingLock.hotkey, 6, 6)
    )
  }, [combinedValidatorsData, existingLock?.hotkey])

  const { payload, txMetadata, feeEstimate, isLoadingFeeEstimate, errorFeeEstimate } =
    useBittensorChangeLockTypePayload({
      networkId,
      address: address || null,
      netuid,
      makePerpetual: targetIsPerpetual,
      // no payload for a no-op flip: it would submit a real, fee-burning transaction
      enabled: !!existingLock && !isNoop,
    })

  const feeErrorMessage = useBittensorFeeError({
    allBalances,
    address: address || null,
    feeEstimate,
    feeTokenId: taoTokenId,
  })
  const payloadToSubmit = feeErrorMessage ? undefined : payload

  const canContinue = !!existingLock && !isNoop && !!payloadToSubmit

  const setStep = useCallback((step: ChangeLockTypeWizardStep) => {
    setWizardState((prev) => ({ ...prev, step }))
  }, [])

  const setActivePicker = useCallback((activePicker: ChangeLockTypeWizardPicker | null) => {
    setWizardState((prev) => ({ ...prev, activePicker }))
  }, [])

  const selectAccount = useCallback((address: string) => {
    // a different account may have a different current lock type: re-mirror it
    setWizardState((prev) => ({ ...prev, address, makePerpetual: null, activePicker: null }))
  }, [])

  const selectLockType = useCallback((lockType: ConvictionLockType) => {
    setWizardState((prev) => ({
      ...prev,
      makePerpetual: lockType === "perpetual",
      activePicker: null,
    }))
  }, [])

  const onSubmitted = useCallback((hash: Hex) => {
    setWizardState((prev) => ({ ...prev, hash, step: "submitted" }))
  }, [])

  return {
    step,
    activePicker,
    networkId,
    address,
    hash,
    network,
    eligibleAccounts,
    existingLock,
    currentIsPerpetual,
    targetIsPerpetual,
    baseTokenId,
    symbol,
    subnetLabel,
    taoTokenId,
    hotkeyName,
    feeErrorMessage,
    canContinue,
    payload: payloadToSubmit,
    txMetadata,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    close,
    setStep,
    setActivePicker,
    selectAccount,
    selectLockType,
    onSubmitted,
  }
}

export const [BittensorChangeLockTypeWizardProvider, useBittensorChangeLockTypeWizard] =
  provideContext(useBittensorChangeLockTypeWizardProvider)
