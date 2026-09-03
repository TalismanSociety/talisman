import { Button } from "@ui/components/Button"
import { PillButton } from "@ui/components/PillButton"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { AccountPicker } from "@ui/domains/AccountProxies/AddProxy/AccountPicker"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { AddressPillButton } from "@ui/domains/SendFunds/SendFundsAmountForm/AddressPillButton"
import { BittensorHotkeyAvatar } from "@ui/domains/Staking/Bittensor/components/BittensorHotkeyAvatar"
import { StakingFeeEstimate } from "@ui/domains/Staking/shared/StakingFeeEstimate"
import { useTranslation } from "react-i18next"

import { ConvictionLockHotkeyPicker } from "../components/ConvictionLockHotkeyPicker"
import {
  BITTENSOR_CHANGE_LOCK_HOTKEY_MODAL_CONTAINER_ID,
  useBittensorChangeLockHotkeyWizard,
} from "./useBittensorChangeLockHotkeyWizard"

export const BittensorChangeLockHotkeyForm = () => {
  const { t } = useTranslation()
  const {
    activePicker,
    networkId,
    netuid,
    address,
    selectedHotkey,
    network,
    eligibleAccounts,
    existingLock,
    currentOwnerColdkey,
    isSameHotkey,
    convictionOutcome,
    baseTokenId,
    subnetLabel,
    taoTokenId,
    destinationHotkeyName,
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
    selectHotkey,
  } = useBittensorChangeLockHotkeyWizard()

  if (activePicker === "hotkey")
    return (
      <WizardModalDialog
        title={t("Select Hotkey")}
        onBackClick={() => setActivePicker(null)}
        onCloseClick={close}
        contentClassName="p-0! overflow-hidden flex flex-col"
      >
        <ConvictionLockHotkeyPicker
          networkId={networkId}
          netuid={netuid}
          hotkey={selectedHotkey}
          lockOriginColdkey={currentOwnerColdkey}
          onSelect={selectHotkey}
        />
      </WizardModalDialog>
    )

  return (
    <WizardModalDialog
      title={t("Conviction Lock Hotkey")}
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

        {/* Fieldset 2: the editable field — the destination hotkey */}
        <div className="flex flex-col gap-4 rounded bg-grey-900 px-8 py-6 text-body-secondary leading-paragraph">
          <div className="flex h-16 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Hotkey")}</div>
            <PillButton className="h-16 max-w-full px-6!" onClick={() => setActivePicker("hotkey")}>
              <div className="flex h-16 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-base text-body">
                {selectedHotkey ? (
                  <>
                    <BittensorHotkeyAvatar hotkey={selectedHotkey} className="shrink-0 text-lg!" />
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
        onSelect={selectAccount}
        onDismiss={() => setActivePicker(null)}
      />
    </WizardModalDialog>
  )
}
