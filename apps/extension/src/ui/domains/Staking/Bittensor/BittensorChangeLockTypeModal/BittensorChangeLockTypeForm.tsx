import { Button } from "@ui/components/Button"
import { PillButton } from "@ui/components/PillButton"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountPicker } from "@ui/domains/AccountProxies/AddProxy/AccountPicker"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { AddressPillButton } from "@ui/domains/SendFunds/SendFundsAmountForm/AddressPillButton"
import { StakingFeeEstimate } from "@ui/domains/Staking/shared/StakingFeeEstimate"
import { useTranslation } from "react-i18next"

import { BittensorLockTypePicker } from "../components/BittensorLockTypePicker"
import {
  BITTENSOR_CHANGE_LOCK_TYPE_MODAL_CONTAINER_ID,
  useBittensorChangeLockTypeWizard,
} from "./useBittensorChangeLockTypeWizard"

export const BittensorChangeLockTypeForm = () => {
  const { t } = useTranslation()
  const {
    activePicker,
    address,
    network,
    eligibleAccounts,
    existingLock,
    targetLockType,
    isLockTypeLoading,
    baseTokenId,
    symbol,
    subnetLabel,
    taoTokenId,
    hotkeyName,
    lockTypeLabel,
    feeErrorMessage,
    payloadErrorMessage,
    canContinue,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    close,
    setStep,
    setActivePicker,
    selectAccount,
    selectLockType,
  } = useBittensorChangeLockTypeWizard()

  return (
    <WizardModalDialog
      title={t("Conviction Lock Type")}
      onCloseClick={close}
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
              genesisHash={network?.genesisHash}
              onClick={() => setActivePicker("account")}
            />
          </div>
        </div>

        {/* Fieldset 2: the editable field — the lock type */}
        <div className="flex flex-col gap-4 rounded bg-grey-900 px-8 py-6 text-body-secondary leading-[140%]">
          <div className="flex h-16 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Lock type")}</div>
            <PillButton
              className="h-16 max-w-full px-6!"
              disabled={isLockTypeLoading}
              onClick={() => setActivePicker("lockType")}
            >
              <div className="flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base text-body">
                <div className="grow truncate leading-base">{lockTypeLabel}</div>
              </div>
            </PillButton>
          </div>
        </div>
        {(feeErrorMessage || payloadErrorMessage) && (
          <div className="text-center text-alert-error text-sm">
            {feeErrorMessage ?? payloadErrorMessage}
          </div>
        )}
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
        onSelect={selectAccount}
        onDismiss={() => setActivePicker(null)}
      />
      <BittensorLockTypePicker
        isOpen={activePicker === "lockType"}
        containerId={BITTENSOR_CHANGE_LOCK_TYPE_MODAL_CONTAINER_ID}
        value={targetLockType ?? "decaying"}
        symbol={symbol}
        onSelect={selectLockType}
        onDismiss={() => setActivePicker(null)}
      />
    </WizardModalDialog>
  )
}
