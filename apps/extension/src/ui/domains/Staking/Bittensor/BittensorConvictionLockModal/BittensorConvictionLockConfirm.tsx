import { AlertCircleIcon } from "@talismn/icons"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import { StakingAccountDisplay } from "@ui/domains/Staking/shared/StakingAccountDisplay"
import { StakingFeeEstimate } from "@ui/domains/Staking/shared/StakingFeeEstimate"
import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import {
  BITTENSOR_LOCK_MODAL_CONTAINER_ID,
  useBittensorConvictionLockWizard,
} from "./useBittensorConvictionLockWizard"

const SummaryRow: FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex h-10 items-center justify-between gap-8">
    <span className="whitespace-nowrap text-body-secondary">{label}</span>
    <span className="truncate text-body">{children}</span>
  </div>
)

export const BittensorConvictionLockConfirm = () => {
  const { t } = useTranslation()
  const {
    networkId,
    address,
    effectiveHotkey,
    lockDelta,
    targetIsPerpetual,
    isTopUp,
    existingLockAmount,
    symbol,
    baseTokenId,
    taoTokenId,
    payload,
    txMetadata,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    close,
    setStep,
    onSubmitted,
  } = useBittensorConvictionLockWizard()

  const warning = useMemo(
    () =>
      targetIsPerpetual
        ? t(
            "This is a perpetual lock: the locked {{symbol}} does not decay and can't be unstaked while perpetual — transferring it hands the lock and its conviction to the recipient. You can switch it to a decaying lock later to resume the unlock.",
            { symbol }
          )
        : t(
            "Locked {{symbol}} can't be unstaked until the lock gradually decays away — transferring it hands the lock and its conviction to the recipient.",
            { symbol }
          ),
    [symbol, t, targetIsPerpetual]
  )

  if (!address || !effectiveHotkey || typeof lockDelta !== "bigint" || lockDelta <= 0n) return null

  return (
    <WizardModalDialog
      title={t("Conviction Lock")}
      contentClassName="size-full flex flex-col overflow-hidden"
      onBackClick={() => setStep("form")}
      onCloseClick={close}
    >
      <ScrollContainer className="grow" innerClassName="flex w-full flex-col gap-8">
        <h2 className="mb-4 text-center font-bold text-md">{t("Review transaction")}</h2>

        <div className="flex flex-col gap-4 rounded bg-grey-900 px-8 py-6 text-sm">
          <SummaryRow label={t("Account")}>
            <StakingAccountDisplay address={address} chainId={networkId} className="text-sm" />
          </SummaryRow>
          <SummaryRow label={t("Hotkey")}>
            <span className="inline-flex max-w-full items-center gap-4 overflow-hidden align-middle">
              <AccountIcon className="shrink-0 text-lg!" address={effectiveHotkey} />
              <BittensorValidatorName hotkey={effectiveHotkey} className="truncate" />
            </span>
          </SummaryRow>
          <SummaryRow label={isTopUp ? t("Amount to add") : t("Amount to lock")}>
            <TokensAndFiat
              planck={lockDelta}
              tokenId={baseTokenId}
              noCountUp
              tokensClassName="text-body"
            />
          </SummaryRow>
          {isTopUp && (
            <SummaryRow label={t("New total locked")}>
              <TokensAndFiat
                planck={existingLockAmount + lockDelta}
                tokenId={baseTokenId}
                noCountUp
                tokensClassName="text-body"
              />
            </SummaryRow>
          )}
          <SummaryRow label={t("Lock type")}>
            {targetIsPerpetual ? t("Perpetual") : t("Decaying")}
          </SummaryRow>
          <SummaryRow label={t("Network fee")}>
            <StakingFeeEstimate
              plancks={feeEstimate}
              tokenId={taoTokenId}
              isLoading={isLoadingFeeEstimate}
              error={errorFeeEstimate}
              noCountUp
            />
          </SummaryRow>
        </div>

        <div className="flex items-start gap-4 rounded bg-alert-warn/10 px-8 py-6 text-alert-warn text-xs">
          <AlertCircleIcon className="mt-0.5 shrink-0 text-sm" />
          <span>{warning}</span>
        </div>
      </ScrollContainer>

      <SapiSendButton
        containerId={BITTENSOR_LOCK_MODAL_CONTAINER_ID}
        label={t("Confirm")}
        payload={payload}
        txMetadata={txMetadata}
        onSubmitted={onSubmitted}
        disabled={!payload}
        className="shrink-0"
      />
    </WizardModalDialog>
  )
}
