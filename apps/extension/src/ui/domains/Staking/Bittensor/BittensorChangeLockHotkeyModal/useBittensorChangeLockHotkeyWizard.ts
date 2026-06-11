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
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Hex } from "viem"

import { useBittensorChangeLockHotkeyModal } from "../hooks/useBittensorChangeLockHotkeyModal"
import { useBittensorChangeLockHotkeyPayload } from "../hooks/useBittensorChangeLockHotkeyPayload"
import { useBittensorHotkeyExists } from "../hooks/useBittensorHotkeyExists"
import { useBittensorSubnetNeurons } from "../hooks/useBittensorSubnetNeurons"
import { getDTaoSubnetUnstakeInfo } from "../utils/dtaoSubnetUnstakeInfo"

export const BITTENSOR_CHANGE_LOCK_HOTKEY_MODAL_CONTAINER_ID = "bittensor-change-lock-hotkey-modal"

export type ChangeLockHotkeyWizardStep = "form" | "confirm" | "submitted"
export type ChangeLockHotkeyWizardPicker = "account" | "hotkey"

/**
 * The conviction consequence of moving the lock to the chosen hotkey:
 * - `instant-full`: destination is the subnet-owner hotkey → chain grants instant full conviction
 * - `preserved`: destination shares the same owning coldkey → conviction carries over
 * - `reset`: destination has a different owner → accumulated conviction is wiped to zero
 */
export type ConvictionMoveOutcome = "instant-full" | "preserved" | "reset"

type WizardState = {
  step: ChangeLockHotkeyWizardStep
  activePicker: ChangeLockHotkeyWizardPicker | null
  networkId: DotNetworkId
  netuid: number
  address: string
  /** destination hotkey; null = no destination picked yet */
  selectedHotkey: string | null
  hash: Hex | null
}

const DEFAULT_STATE: WizardState = {
  step: "form",
  activePicker: null,
  networkId: "bittensor",
  netuid: 0,
  address: "",
  selectedHotkey: null,
  hash: null,
}

/**
 * Change-lock-hotkey wizard: re-points an existing conviction lock to a different hotkey via
 * `SubtensorModule.move_lock`. Steps: form → confirm → tx progress. The lock's amount and subnet
 * are fixed — only the hotkey it's keyed to changes. Moving to a hotkey owned by a different coldkey
 * resets the accumulated conviction to zero, so the destination is the one editable field.
 */
const useBittensorChangeLockHotkeyWizardProvider = () => {
  const { close, args } = useBittensorChangeLockHotkeyModal()

  const [{ step, activePicker, networkId, netuid, address, selectedHotkey, hash }, setWizardState] =
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

  // only existing locks can be moved: restrict to accounts with a conviction lock on this subnet
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
  const currentHotkey = existingLock?.hotkey ?? null
  // a move to the hotkey the lock already sits on is a fee-burning no-op
  const isSameHotkey =
    !!selectedHotkey && !!currentHotkey && isAddressEqual(selectedHotkey, currentHotkey)

  // preselect the lock's current hotkey so the picker/button shows it; re-seed once per account
  // (gated by address) so balance polls don't clobber an in-progress pick
  const refSeededAddress = useRef<string | null>(null)
  useEffect(() => {
    if (!address || !currentHotkey) return
    if (refSeededAddress.current === address) return
    refSeededAddress.current = address
    setWizardState((prev) => ({ ...prev, selectedHotkey: currentHotkey }))
  }, [address, currentHotkey])

  const baseTokenId = useMemo(() => subDTaoTokenId(networkId, netuid), [networkId, netuid])
  const baseToken = useToken(baseTokenId, "substrate-dtao")
  const symbol = `SN${netuid}`
  const subnetLabel = baseToken?.subnetName ? `${netuid} · ${baseToken.subnetName}` : symbol

  const { taoTokenId } = useSubnetTokens(netuid)

  const { combinedValidatorsData } = useCombinedBittensorValidatorsData(netuid)

  const destinationHotkeyName = useMemo(() => {
    if (!selectedHotkey) return null
    return (
      combinedValidatorsData.find((v) => v.hotkey === selectedHotkey)?.name ||
      shortenAddress(selectedHotkey, 6, 6)
    )
  }, [combinedValidatorsData, selectedHotkey])

  // resolve each hotkey's owning coldkey: move_lock keeps the lock's conviction only when origin and
  // destination share the same owner, and wipes it to zero otherwise. The subnet-owner hotkey is the
  // exception — the chain grants it instant full conviction regardless of owner.
  const { coldkey: currentOwnerColdkey } = useBittensorHotkeyExists(networkId, currentHotkey)
  const { coldkey: destinationOwnerColdkey } = useBittensorHotkeyExists(networkId, selectedHotkey)

  const { neurons } = useBittensorSubnetNeurons(networkId, netuid)
  const subnetOwnerHotkey = useMemo(
    () => neurons.find((n) => n.role === "owner")?.hotkey ?? null,
    [neurons]
  )

  // "checking" while owner coldkeys are still resolving; null when there's nothing to evaluate yet
  const convictionOutcome = useMemo<ConvictionMoveOutcome | "checking" | null>(() => {
    if (!selectedHotkey || isSameHotkey) return null
    if (subnetOwnerHotkey && isAddressEqual(selectedHotkey, subnetOwnerHotkey))
      return "instant-full"
    if (!currentOwnerColdkey || !destinationOwnerColdkey) return "checking"
    return isAddressEqual(currentOwnerColdkey, destinationOwnerColdkey) ? "preserved" : "reset"
  }, [
    selectedHotkey,
    isSameHotkey,
    subnetOwnerHotkey,
    currentOwnerColdkey,
    destinationOwnerColdkey,
  ])

  const { payload, txMetadata, feeEstimate, isLoadingFeeEstimate, errorFeeEstimate } =
    useBittensorChangeLockHotkeyPayload({
      networkId,
      address: address || null,
      netuid,
      destinationHotkey: selectedHotkey,
      // no payload for a no-op move: it would submit a real, fee-burning transaction
      enabled: !!existingLock && !!selectedHotkey && !isSameHotkey,
    })

  // gate Review until the conviction consequence is known, so the user always sees it before signing
  const canContinue =
    !!existingLock &&
    !!selectedHotkey &&
    !isSameHotkey &&
    !!payload &&
    convictionOutcome !== "checking"

  const setStep = useCallback((step: ChangeLockHotkeyWizardStep) => {
    setWizardState((prev) => ({ ...prev, step }))
  }, [])

  const setActivePicker = useCallback((activePicker: ChangeLockHotkeyWizardPicker | null) => {
    setWizardState((prev) => ({ ...prev, activePicker }))
  }, [])

  const selectAccount = useCallback((address: string) => {
    // clear the pick; the seeding effect re-selects the new account's current hotkey
    setWizardState((prev) => ({ ...prev, address, selectedHotkey: null, activePicker: null }))
  }, [])

  const selectHotkey = useCallback((hotkey: string) => {
    setWizardState((prev) => ({ ...prev, selectedHotkey: hotkey, activePicker: null }))
  }, [])

  const onSubmitted = useCallback((hash: Hex) => {
    setWizardState((prev) => ({ ...prev, hash, step: "submitted" }))
  }, [])

  return {
    step,
    activePicker,
    networkId,
    netuid,
    address,
    selectedHotkey,
    hash,
    network,
    eligibleAccounts,
    existingLock,
    currentOwnerColdkey,
    isSameHotkey,
    convictionOutcome,
    baseTokenId,
    symbol,
    subnetLabel,
    taoTokenId,
    destinationHotkeyName,
    canContinue,
    payload,
    txMetadata,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    close,
    setStep,
    setActivePicker,
    selectAccount,
    selectHotkey,
    onSubmitted,
  }
}

export const [BittensorChangeLockHotkeyWizardProvider, useBittensorChangeLockHotkeyWizard] =
  provideContext(useBittensorChangeLockHotkeyWizardProvider)
