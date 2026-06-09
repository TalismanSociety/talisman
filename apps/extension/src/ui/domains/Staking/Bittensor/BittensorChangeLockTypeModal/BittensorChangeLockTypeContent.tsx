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
import { type FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"

import {
  BittensorLockTypePicker,
  type ConvictionLockType,
} from "../BittensorConvictionLockModal/BittensorLockTypePicker"
import { useBittensorChangeLockTypePayload } from "../hooks/useBittensorChangeLockTypePayload"
import { getDTaoSubnetUnstakeInfo } from "../utils/dtaoSubnetUnstakeInfo"
import { BittensorChangeLockTypeConfirm } from "./BittensorChangeLockTypeConfirm"

export const BITTENSOR_CHANGE_LOCK_TYPE_MODAL_CONTAINER_ID = "bittensor-change-lock-type-modal"

/**
 * Change-lock-type wizard: toggles an existing conviction lock between decaying and perpetual
 * via `SubtensorModule.set_perpetual_lock`. Steps: form → confirm → tx progress. The lock's
 * hotkey and amount are fixed — only the decay flag changes, and the flip is reversible.
 */
type Step = "form" | "confirm" | "submitted"

type BittensorChangeLockTypeContentProps = {
  networkId: DotNetworkId
  netuid: number
  seedAddress?: string
  onClose: () => void
}

export const BittensorChangeLockTypeContent: FC<BittensorChangeLockTypeContentProps> = ({
  networkId,
  netuid,
  seedAddress,
  onClose,
}) => {
  const { t } = useTranslation()

  const [step, setStep] = useState<Step>("form")
  const [activePicker, setActivePicker] = useState<"account" | "lockType" | null>(null)
  const [address, setAddress] = useState(seedAddress ?? "")
  // null = mirror the current lock type until the user picks a target
  const [makePerpetual, setMakePerpetual] = useState<boolean | null>(null)
  const [submittedHash, setSubmittedHash] = useState<Hex | null>(null)

  const accounts = useAccounts("owned")
  const bittensor = useDotNetwork(networkId)
  const allBalances = useBalances("owned")

  // only existing locks can be toggled: restrict to accounts with a conviction lock on this subnet
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

  const canContinue = !!existingLock && !isNoop && !!payload

  const handleSelectAccount = useCallback((addr: string) => {
    setAddress(addr)
    // a different account may have a different current lock type: re-mirror it
    setMakePerpetual(null)
    setActivePicker(null)
  }, [])

  const handleSelectLockType = useCallback((value: ConvictionLockType) => {
    setMakePerpetual(value === "perpetual")
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

  if (step === "confirm" && address && existingLock)
    return (
      <BittensorChangeLockTypeConfirm
        networkId={networkId}
        address={address}
        hotkey={existingLock.hotkey}
        lockedAmount={existingLock.amount}
        currentIsPerpetual={currentIsPerpetual}
        targetIsPerpetual={targetIsPerpetual}
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

  return (
    <WizardModalDialog
      title={t("Conviction Lock Type")}
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

        {/* Fieldset 2: the editable field — the lock type */}
        <div className="flex flex-col gap-4 rounded bg-grey-900 px-8 py-6 text-body-secondary leading-[140%]">
          <div className="flex h-16 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Lock type")}</div>
            <PillButton
              className="h-16 max-w-full px-4!"
              onClick={() => setActivePicker("lockType")}
            >
              <div className="flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base text-body">
                <div className="grow truncate leading-base">
                  {targetIsPerpetual ? t("Perpetual") : t("Decaying")}
                </div>
              </div>
            </PillButton>
          </div>
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
            <div className="whitespace-nowrap">{t("Hotkey")}</div>
            {existingLock && (
              <div className="flex h-12 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-body">
                <AccountIcon className="text-lg!" address={existingLock.hotkey} />
                <div className="grow truncate leading-base">{hotkeyName}</div>
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
        containerId={BITTENSOR_CHANGE_LOCK_TYPE_MODAL_CONTAINER_ID}
        accounts={eligibleAccounts}
        selectedAddress={address}
        onSelect={handleSelectAccount}
        onDismiss={() => setActivePicker(null)}
      />
      <BittensorLockTypePicker
        isOpen={activePicker === "lockType"}
        containerId={BITTENSOR_CHANGE_LOCK_TYPE_MODAL_CONTAINER_ID}
        value={targetIsPerpetual ? "perpetual" : "decaying"}
        symbol={symbol}
        onSelect={handleSelectLockType}
        onDismiss={() => setActivePicker(null)}
      />
    </WizardModalDialog>
  )
}
