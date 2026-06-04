import { isAccountCompatibleWithNetwork } from "@core/domains/accounts/helpers"
import { TAO_DECIMALS } from "@talismn/balances"
import { type DotNetworkId, subDTaoTokenId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { PlusIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { PillButton } from "@ui/components/PillButton"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountPicker } from "@ui/domains/AccountProxies/AddProxy/AccountPicker"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { AddressPillButton } from "@ui/domains/SendFunds/SendFundsAmountForm/AddressPillButton"
import { useCombinedBittensorValidatorsData } from "@ui/domains/Staking/hooks/bittensor/useCombinedBittensorValidatorsData"
import { StakingFeeEstimate } from "@ui/domains/Staking/shared/StakingFeeEstimate"
import { useSubnetTokens } from "@ui/domains/TaoDashboard/hooks/useSubnetTokens"
import { BittensorValidatorPicker } from "@ui/domains/TaoDashboard/subnet/swap/BittensorValidatorPicker"
import { TxProgress } from "@ui/domains/Transactions/TxProgress"
import { useAccounts } from "@ui/state/accounts"
import { useBalances } from "@ui/state/balances"
import { useDotNetwork, useToken } from "@ui/state/chaindata"
import { shortenAddress } from "@ui/util/shortenAddress"
import { type FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"

import { useBittensorConvictionLockPayload } from "../hooks/useBittensorConvictionLockPayload"
import { getDTaoSubnetUnstakeInfo } from "../utils/dtaoSubnetUnstakeInfo"
import { BittensorConvictionLockAmountField } from "./BittensorConvictionLockAmountField"
import { BittensorConvictionLockConfirm } from "./BittensorConvictionLockConfirm"
import { BittensorLockTypePicker } from "./BittensorLockTypePicker"

export const BITTENSOR_LOCK_MODAL_CONTAINER_ID = "bittensor-conviction-lock-modal"

/**
 * Conviction lock wizard: locks already-staked alpha on a subnet to a hotkey for governance
 * conviction. Steps: form → confirm → tx progress. Adapts to an existing lock (top-up, forced
 * hotkey) and offers a decaying/perpetual choice.
 */
type Step = "form" | "confirm" | "submitted"

type BittensorConvictionLockContentProps = {
  networkId: DotNetworkId
  netuid: number
  seedAddress?: string
  seedHotkey?: string
  onClose: () => void
}

export const BittensorConvictionLockContent: FC<BittensorConvictionLockContentProps> = ({
  networkId,
  netuid,
  seedAddress,
  seedHotkey,
  onClose,
}) => {
  const { t } = useTranslation()

  const [step, setStep] = useState<Step>("form")
  const [activePicker, setActivePicker] = useState<"account" | "validator" | "lockType" | null>(
    null
  )
  const [address, setAddress] = useState(seedAddress ?? "")
  const [selectedHotkey, setSelectedHotkey] = useState<string | null>(seedHotkey ?? null)
  const [plancks, setPlancks] = useState<bigint | null>(null)
  const [makePerpetual, setMakePerpetual] = useState(false)
  const [submittedHash, setSubmittedHash] = useState<Hex | null>(null)

  const accounts = useAccounts("owned")
  const bittensor = useDotNetwork(networkId)
  const allBalances = useBalances("owned")

  // only already-staked alpha can be locked: restrict to accounts with stake on this subnet
  const eligibleAccounts = useMemo(() => {
    if (!bittensor) return []
    return accounts.filter(
      (a) =>
        isAccountCompatibleWithNetwork(bittensor, a) &&
        getDTaoSubnetUnstakeInfo(allBalances, a.address, networkId, netuid).stakedTotal > 0n
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
  const isTopUp = !!existingLock
  const isAlreadyPerpetual = existingLock?.lockType === "perpetual"
  // available_to_unstake = Σ stakes − current lock: exactly the amount that can still be locked
  const maxLockable = subnetUnstakeInfo?.available ?? 0n

  // a lock is keyed to one hotkey: the chain forces top-ups to reuse it, otherwise the user picks
  const effectiveHotkey = existingLock?.hotkey ?? selectedHotkey

  const baseTokenId = useMemo(() => subDTaoTokenId(networkId, netuid), [networkId, netuid])
  const baseToken = useToken(baseTokenId)
  const decimals = Number(baseToken?.decimals ?? TAO_DECIMALS)
  const symbol = `SN${netuid}`

  const { taoTokenId } = useSubnetTokens(netuid)

  const { combinedValidatorsData } = useCombinedBittensorValidatorsData(netuid)
  const validatorName = useMemo(() => {
    if (!effectiveHotkey) return null
    return (
      combinedValidatorsData.find((v) => v.hotkey === effectiveHotkey)?.name ||
      shortenAddress(effectiveHotkey, 6, 6)
    )
  }, [combinedValidatorsData, effectiveHotkey])

  const lockTypeLabel =
    isAlreadyPerpetual || makePerpetual ? t("Perpetual Lock") : t("Decaying Lock")

  const { payload, txMetadata, feeEstimate, isLoadingFeeEstimate, errorFeeEstimate } =
    useBittensorConvictionLockPayload({
      networkId,
      address: address || null,
      hotkey: effectiveHotkey,
      netuid,
      amount: plancks,
      makePerpetual,
      isAlreadyPerpetual,
      feeAmount: maxLockable,
    })

  const errorMessage = useMemo(() => {
    if (maxLockable <= 0n) return t("All your stake on this subnet is already locked")
    if (typeof plancks !== "bigint" || plancks <= 0n) return null
    if (plancks > maxLockable) return t("Amount exceeds your stake available to lock")
    return null
  }, [maxLockable, plancks, t])

  const canContinue =
    !!effectiveHotkey &&
    typeof plancks === "bigint" &&
    plancks > 0n &&
    plancks <= maxLockable &&
    !!payload

  const handleSelectAccount = useCallback((addr: string) => {
    setAddress(addr)
    // a different account may carry its own lock/hotkey constraints
    setSelectedHotkey(null)
    setPlancks(null)
    setActivePicker(null)
  }, [])

  const handleSelectValidator = useCallback((hotkey: string) => {
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

  if (step === "confirm" && address && effectiveHotkey && typeof plancks === "bigint")
    return (
      <BittensorConvictionLockConfirm
        address={address}
        hotkey={effectiveHotkey}
        amount={plancks}
        makePerpetual={makePerpetual}
        isAlreadyPerpetual={isAlreadyPerpetual}
        isTopUp={isTopUp}
        existingLockAmount={existingLock?.amount ?? 0n}
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

  if (activePicker === "validator")
    return (
      <WizardModalDialog
        title={t("Select Validator")}
        onBackClick={() => setActivePicker(null)}
        onCloseClick={onClose}
        contentClassName="p-0! overflow-hidden flex flex-col"
      >
        <BittensorValidatorPicker
          networkId={networkId}
          netuid={netuid}
          hotkey={effectiveHotkey}
          onSelect={handleSelectValidator}
        />
      </WizardModalDialog>
    )

  return (
    <WizardModalDialog
      title={t("Create conviction lock")}
      onCloseClick={onClose}
      contentClassName="overflow-hidden flex flex-col gap-8"
    >
      <ScrollContainer className="grow" innerClassName="flex w-full flex-col gap-8">
        <div className="flex flex-col gap-4 rounded bg-grey-900 px-8 py-6 text-body-secondary leading-[140%]">
          <div className="flex h-16 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Account")}</div>
            <AddressPillButton
              className="max-w-65!"
              address={address || null}
              genesisHash={bittensor?.genesisHash}
              onClick={() => setActivePicker("account")}
            />
          </div>
          <div className="flex h-16 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Validator")}</div>
            {effectiveHotkey ? (
              <PillButton
                className="h-16 max-w-full px-4!"
                disabled={isTopUp}
                onClick={() => setActivePicker("validator")}
              >
                <div className="flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base text-body">
                  <AccountIcon className="text-lg!" address={effectiveHotkey} />
                  <div className="grow truncate leading-base">{validatorName}</div>
                </div>
              </PillButton>
            ) : (
              <PillButton
                className="h-16 max-w-full px-4!"
                onClick={() => setActivePicker("validator")}
              >
                <div className="flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base text-body">
                  <div className="flex size-12 items-center justify-center rounded-full bg-grey-750 text-primary">
                    <PlusIcon className="text-primary" />
                  </div>
                  {t("Select validator")}
                </div>
              </PillButton>
            )}
          </div>
          {isTopUp && (
            <div className="text-body-disabled text-tiny">
              {t(
                "You already have a lock on this subnet — adding to it, keyed to the same validator."
              )}
            </div>
          )}
          <div className="flex h-16 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Lock type")}</div>
            <PillButton
              className="h-16 max-w-full px-4!"
              disabled={isAlreadyPerpetual}
              onClick={() => setActivePicker("lockType")}
            >
              <div className="flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base text-body">
                <div className="grow truncate leading-base">{lockTypeLabel}</div>
              </div>
            </PillButton>
          </div>
        </div>

        <BittensorConvictionLockAmountField
          tokenId={baseTokenId}
          decimals={decimals}
          symbol={symbol}
          plancks={plancks}
          maxPlancks={maxLockable}
          onChange={setPlancks}
          errorMessage={errorMessage}
        />

        <div className="flex flex-col gap-4 rounded bg-grey-900 px-8 py-6 text-body-secondary text-xs leading-paragraph">
          <div className="flex items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Available to lock")}</div>
            <TokensAndFiat
              planck={maxLockable}
              tokenId={baseTokenId}
              noCountUp
              tokensClassName="text-body"
            />
          </div>
          {isTopUp && existingLock && (
            <div className="flex items-center justify-between gap-8">
              <div className="whitespace-nowrap">{t("Currently locked")}</div>
              <TokensAndFiat
                planck={existingLock.amount}
                tokenId={baseTokenId}
                noCountUp
                tokensClassName="text-body"
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Estimated Fee")}</div>
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
        containerId={BITTENSOR_LOCK_MODAL_CONTAINER_ID}
        accounts={eligibleAccounts}
        selectedAddress={address}
        onSelect={handleSelectAccount}
        onDismiss={() => setActivePicker(null)}
      />
      <BittensorLockTypePicker
        isOpen={activePicker === "lockType"}
        containerId={BITTENSOR_LOCK_MODAL_CONTAINER_ID}
        value={isAlreadyPerpetual || makePerpetual ? "perpetual" : "decaying"}
        symbol={symbol}
        onSelect={(value) => setMakePerpetual(value === "perpetual")}
        onDismiss={() => setActivePicker(null)}
      />
    </WizardModalDialog>
  )
}
