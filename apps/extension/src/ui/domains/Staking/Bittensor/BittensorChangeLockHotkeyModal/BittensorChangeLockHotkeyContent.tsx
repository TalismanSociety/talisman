import { isAccountCompatibleWithNetwork } from "@core/domains/accounts/helpers"
import { type DotNetworkId, subDTaoTokenId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { Button } from "@ui/components/Button"
import { PillButton } from "@ui/components/PillButton"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountPicker } from "@ui/domains/AccountProxies/AddProxy/AccountPicker"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { AddressPillButton } from "@ui/domains/SendFunds/SendFundsAmountForm/AddressPillButton"
import { useCombinedBittensorValidatorsData } from "@ui/domains/Staking/hooks/bittensor/useCombinedBittensorValidatorsData"
import { StakingFeeEstimate } from "@ui/domains/Staking/shared/StakingFeeEstimate"
import { useSubnetTokens } from "@ui/domains/TaoDashboard/hooks/useSubnetTokens"
import { TxProgress } from "@ui/domains/Transactions/TxProgress"
import { useAccounts } from "@ui/state/accounts"
import { useBalances } from "@ui/state/balances"
import { useDotNetwork, useToken } from "@ui/state/chaindata"
import { shortenAddress } from "@ui/util/shortenAddress"
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"

import { ConvictionLockHotkeyPicker } from "../BittensorConvictionLockModal/ConvictionLockHotkeyPicker"
import { useBittensorChangeLockHotkeyPayload } from "../hooks/useBittensorChangeLockHotkeyPayload"
import { useBittensorHotkeyExists } from "../hooks/useBittensorHotkeyExists"
import { useBittensorSubnetNeurons } from "../hooks/useBittensorSubnetNeurons"
import { getDTaoSubnetUnstakeInfo } from "../utils/dtaoSubnetUnstakeInfo"
import { BittensorChangeLockHotkeyConfirm } from "./BittensorChangeLockHotkeyConfirm"

export const BITTENSOR_CHANGE_LOCK_HOTKEY_MODAL_CONTAINER_ID = "bittensor-change-lock-hotkey-modal"

/**
 * Change-lock-hotkey wizard: re-points an existing conviction lock to a different hotkey via
 * `SubtensorModule.move_lock`. Steps: form → confirm → tx progress. The lock's amount and subnet
 * are fixed — only the hotkey it's keyed to changes. Moving to a hotkey owned by a different coldkey
 * resets the accumulated conviction to zero, so the destination is the one editable field.
 */
type Step = "form" | "confirm" | "submitted"

/**
 * The conviction consequence of moving the lock to the chosen hotkey:
 * - `instant-full`: destination is the subnet-owner hotkey → chain grants instant full conviction
 * - `preserved`: destination shares the same owning coldkey → conviction carries over
 * - `reset`: destination has a different owner → accumulated conviction is wiped to zero
 */
export type ConvictionMoveOutcome = "instant-full" | "preserved" | "reset"

type BittensorChangeLockHotkeyContentProps = {
  networkId: DotNetworkId
  netuid: number
  seedAddress?: string
  onClose: () => void
}

export const BittensorChangeLockHotkeyContent: FC<BittensorChangeLockHotkeyContentProps> = ({
  networkId,
  netuid,
  seedAddress,
  onClose,
}) => {
  const { t } = useTranslation()

  const [step, setStep] = useState<Step>("form")
  const [activePicker, setActivePicker] = useState<"account" | "hotkey" | null>(null)
  const [address, setAddress] = useState(seedAddress ?? "")
  // null = no destination picked yet
  const [selectedHotkey, setSelectedHotkey] = useState<string | null>(null)
  const [submittedHash, setSubmittedHash] = useState<Hex | null>(null)

  const accounts = useAccounts("owned")
  const bittensor = useDotNetwork(networkId)
  const allBalances = useBalances("owned")

  // only existing locks can be moved: restrict to accounts with a conviction lock on this subnet
  const eligibleAccounts = useMemo(() => {
    if (!bittensor) return []
    return accounts.filter(
      (a) =>
        isAccountCompatibleWithNetwork(bittensor, a) &&
        !!getDTaoSubnetUnstakeInfo(allBalances, a.address, networkId, netuid).convictionLock
    )
  }, [accounts, allBalances, bittensor, networkId, netuid])

  // keep a valid account selected
  useEffect(() => {
    if (!eligibleAccounts.length) return
    if (!address || !eligibleAccounts.some((a) => isAddressEqual(a.address, address)))
      setAddress(eligibleAccounts[0].address)
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
    setSelectedHotkey(currentHotkey)
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

  const { neurons } = useBittensorSubnetNeurons(networkId, netuid, address || null)
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

  const handleSelectAccount = useCallback((addr: string) => {
    setAddress(addr)
    // clear the pick; the seeding effect re-selects the new account's current hotkey
    setSelectedHotkey(null)
    setActivePicker(null)
  }, [])

  const handleSelectHotkey = useCallback((hotkey: string) => {
    setSelectedHotkey(hotkey)
    setActivePicker(null)
  }, [])

  const handleSubmitted = useCallback((hash: Hex) => {
    setSubmittedHash(hash)
    setStep("submitted")
  }, [])

  if (step === "submitted" && submittedHash)
    return (
      <div className="size-full p-12">
        <TxProgress hash={submittedHash} networkIdOrHash={networkId} onClose={onClose} />
      </div>
    )

  if (
    step === "confirm" &&
    address &&
    existingLock &&
    selectedHotkey &&
    !!convictionOutcome &&
    convictionOutcome !== "checking"
  )
    return (
      <BittensorChangeLockHotkeyConfirm
        networkId={networkId}
        address={address}
        currentHotkey={existingLock.hotkey}
        destinationHotkey={selectedHotkey}
        convictionOutcome={convictionOutcome}
        lockedAmount={existingLock.amount}
        symbol={symbol}
        tokenId={baseTokenId}
        taoTokenId={taoTokenId}
        payload={payload}
        txMetadata={txMetadata}
        feeEstimate={feeEstimate}
        isLoadingFeeEstimate={isLoadingFeeEstimate}
        errorFeeEstimate={errorFeeEstimate}
        onBack={() => setStep("form")}
        onClose={onClose}
        onSubmitted={handleSubmitted}
      />
    )

  if (activePicker === "hotkey")
    return (
      <WizardModalDialog
        title={t("Select hotkey")}
        onBackClick={() => setActivePicker(null)}
        onCloseClick={onClose}
        contentClassName="p-0! overflow-hidden flex flex-col"
      >
        <ConvictionLockHotkeyPicker
          networkId={networkId}
          netuid={netuid}
          address={address || null}
          hotkey={selectedHotkey}
          lockOriginColdkey={currentOwnerColdkey}
          onSelect={handleSelectHotkey}
        />
      </WizardModalDialog>
    )

  return (
    <WizardModalDialog
      title={t("Conviction Lock Hotkey")}
      onCloseClick={onClose}
      contentClassName="overflow-hidden flex flex-col gap-8"
    >
      <ScrollContainer className="grow" innerClassName="flex w-full flex-col gap-8">
        {/* Fieldset 1: subnet & account — mirrors the conviction lock modal */}
        <div className="flex flex-col gap-4 rounded bg-grey-900 px-8 py-6 text-body-secondary leading-[140%]">
          <div className="flex h-16 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Subnet")}</div>
            <div className="flex min-w-0 items-center gap-4 text-body">
              <TokenLogo className="shrink-0 text-lg" tokenId={baseTokenId} />
              <div className="truncate">{subnetLabel}</div>
            </div>
          </div>
          <div className="flex h-16 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Account")}</div>
            <AddressPillButton
              className="max-w-65!"
              address={address || null}
              genesisHash={bittensor?.genesisHash}
              onClick={() => setActivePicker("account")}
            />
          </div>
        </div>

        {/* Fieldset 2: the editable field — the destination hotkey */}
        <div className="flex flex-col gap-4 rounded bg-grey-900 px-8 py-6 text-body-secondary leading-[140%]">
          <div className="flex h-16 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Hotkey")}</div>
            <PillButton className="h-16 max-w-full px-6!" onClick={() => setActivePicker("hotkey")}>
              <div className="flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base text-body">
                {selectedHotkey ? (
                  <>
                    <AccountIcon className="shrink-0 text-lg!" address={selectedHotkey} />
                    <div className="grow truncate leading-base">{destinationHotkeyName}</div>
                  </>
                ) : (
                  <div className="grow truncate text-body-secondary leading-base">
                    {t("Select hotkey")}
                  </div>
                )}
              </div>
            </PillButton>
          </div>
          {isSameHotkey ? (
            <div className="text-body-disabled text-xs">
              {t("Pick a different hotkey to continue — the lock is already keyed to this one.")}
            </div>
          ) : convictionOutcome === "reset" ? (
            <div className="items-start text-alert-warn text-xs">
              {t(
                "This hotkey has a different owner. Moving the lock here resets your accumulated conviction to zero."
              )}
            </div>
          ) : convictionOutcome === "instant-full" ? (
            <div className="text-body-disabled text-xs">
              {t("This is the subnet owner hotkey. The lock keeps full conviction here.")}
            </div>
          ) : convictionOutcome === "preserved" ? (
            <div className="text-body-disabled text-xs">
              {t("This hotkey shares the same owner. Your conviction carries over unchanged.")}
            </div>
          ) : null}
        </div>
        <div className="grow"></div>

        {/* Fieldset 3: read-only details — compact rows, mirrors the conviction lock modal */}
        <div className="flex flex-col gap-1 rounded bg-grey-900 px-8 py-6 text-body-secondary text-xs leading-paragraph">
          <div className="flex h-12 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Existing conviction lock")}</div>
            {existingLock && (
              <TokensAndFiat
                planck={existingLock.amount}
                tokenId={baseTokenId}
                noCountUp
                tokensClassName="text-body"
              />
            )}
          </div>
          <div className="flex h-12 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Lock type")}</div>
            {existingLock && (
              <div className="truncate text-body">
                {existingLock.lockType === "perpetual" ? t("Perpetual") : t("Decaying")}
              </div>
            )}
          </div>

          <div className="flex h-12 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Estimated fee")}</div>
            <div className="overflow-hidden">
              <StakingFeeEstimate
                plancks={feeEstimate}
                tokenId={taoTokenId}
                isLoading={isLoadingFeeEstimate}
                error={errorFeeEstimate}
              />
            </div>
          </div>
        </div>
      </ScrollContainer>

      <Button
        primary
        onClick={() => setStep("confirm")}
        disabled={!canContinue}
        className="shrink-0"
      >
        {t("Review")}
      </Button>

      <AccountPicker
        isOpen={activePicker === "account"}
        containerId={BITTENSOR_CHANGE_LOCK_HOTKEY_MODAL_CONTAINER_ID}
        accounts={eligibleAccounts}
        selectedAddress={address}
        onSelect={handleSelectAccount}
        onDismiss={() => setActivePicker(null)}
      />
    </WizardModalDialog>
  )
}
