import { Button } from "@ui/components/Button"
import { PillButton } from "@ui/components/PillButton"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { AccountPicker } from "@ui/domains/AccountProxies/AddProxy/AccountPicker"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { AddressPillButton } from "@ui/domains/SendFunds/SendFundsAmountForm/AddressPillButton"
import { StakingFeeEstimate } from "@ui/domains/Staking/shared/StakingFeeEstimate"
import { useTranslation } from "react-i18next"

import { BittensorLockTypePicker } from "../components/BittensorLockTypePicker"
import { ConvictionLockHotkeyPicker } from "../components/ConvictionLockHotkeyPicker"
import { BittensorConvictionLockAmountField } from "./BittensorConvictionLockAmountField"
import { BittensorConvictionLockInfoDrawer } from "./BittensorConvictionLockInfoDrawer"
import {
  BITTENSOR_LOCK_MODAL_CONTAINER_ID,
  useBittensorConvictionLockWizard,
} from "./useBittensorConvictionLockWizard"

export const BittensorConvictionLockForm = () => {
  const { t } = useTranslation()
  const {
    activePicker,
    networkId,
    netuid,
    address,
    plancks,
    makePerpetual,
    showInfoDrawer,
    network,
    eligibleAccounts,
    existingLockAmount,
    isTopUp,
    isAlreadyPerpetual,
    stakedTotal,
    effectiveHotkey,
    baseTokenId,
    decimals,
    symbol,
    subnetLabel,
    taoTokenId,
    hotkeyName,
    lockTypeLabel,
    errorMessage,
    canContinue,
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
  } = useBittensorConvictionLockWizard()

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
          address={address || null}
          hotkey={effectiveHotkey}
          onSelect={selectHotkey}
        />
      </WizardModalDialog>
    )

  return (
    <WizardModalDialog
      title={t("Conviction Lock")}
      onCloseClick={close}
      contentClassName="overflow-hidden flex flex-col gap-8"
    >
      <ScrollContainer className="grow" innerClassName="flex w-full flex-col gap-8">
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

        <BittensorConvictionLockAmountField
          tokenId={baseTokenId}
          decimals={decimals}
          symbol={symbol}
          plancks={plancks}
          maxPlancks={stakedTotal}
          onChange={setPlancks}
          errorMessage={errorMessage}
        />

        <div className="flex flex-col gap-1 rounded bg-grey-900 px-8 py-6 text-body-secondary text-xs leading-paragraph">
          <div className="flex h-12 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Existing conviction lock")}</div>
            <TokensAndFiat
              planck={existingLockAmount}
              tokenId={baseTokenId}
              noCountUp
              tokensClassName="text-body"
            />
          </div>
          <div className="flex h-12 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Available balance")}</div>
            <TokensAndFiat
              planck={stakedTotal}
              tokenId={baseTokenId}
              noCountUp
              tokensClassName="text-body"
            />
          </div>
          <div className="flex h-12 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Lock type")}</div>
            <PillButton
              className="h-12 max-w-full px-6!"
              disabled={isAlreadyPerpetual}
              onClick={() => setActivePicker("lockType")}
            >
              <div className="flex h-12 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-body">
                <div className="grow truncate leading-base">{lockTypeLabel}</div>
              </div>
            </PillButton>
          </div>
          <div className="flex h-12 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Hotkey")}</div>
            {effectiveHotkey ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex max-w-full overflow-hidden">
                    <PillButton
                      className="h-12 max-w-full px-6! disabled:pointer-events-none"
                      disabled={isTopUp}
                      onClick={() => setActivePicker("hotkey")}
                    >
                      <div className="flex h-12 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-body">
                        <div className="grow truncate leading-base">{hotkeyName}</div>
                      </div>
                    </PillButton>
                  </span>
                </TooltipTrigger>
                {isTopUp && (
                  <TooltipContent>
                    {t("Adding to your existing lock, keyed to the same hotkey.")}
                  </TooltipContent>
                )}
              </Tooltip>
            ) : (
              <PillButton
                className="h-12 max-w-full px-6!"
                onClick={() => setActivePicker("hotkey")}
              >
                <div className="flex h-12 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-body">
                  {t("Select hotkey")}
                </div>
              </PillButton>
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
        containerId={BITTENSOR_LOCK_MODAL_CONTAINER_ID}
        accounts={eligibleAccounts}
        selectedAddress={address}
        onSelect={selectAccount}
        onDismiss={() => setActivePicker(null)}
      />
      <BittensorLockTypePicker
        isOpen={activePicker === "lockType"}
        containerId={BITTENSOR_LOCK_MODAL_CONTAINER_ID}
        value={isAlreadyPerpetual || makePerpetual ? "perpetual" : "decaying"}
        symbol={symbol}
        onSelect={selectLockType}
        onDismiss={() => setActivePicker(null)}
      />
      <BittensorConvictionLockInfoDrawer
        isOpen={showInfoDrawer}
        containerId={BITTENSOR_LOCK_MODAL_CONTAINER_ID}
        onCancel={close}
        onContinue={closeInfoDrawer}
      />
    </WizardModalDialog>
  )
}
