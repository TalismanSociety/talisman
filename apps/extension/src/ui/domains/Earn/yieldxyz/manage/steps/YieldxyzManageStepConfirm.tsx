import type { ActionDto } from "@core/domains/earn/exports"
import { LoaderIcon } from "@talismn/icons"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { RiskAnalysisProvider } from "@ui/domains/Sign/risk-analysis/context"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { AccountDisplay } from "../../../shared/AccountDisplay"
import { FormFieldSetRow, FormFieldSetSeparator } from "../../../shared/FormFieldSet"
import { YieldxyzConfirmBody } from "../../components/YieldxyzConfirm"
import { YieldxyzProductTitleDisplay } from "../../components/YieldxyzProductTitleDisplay"
import { YieldxyzProviderDisplay } from "../../components/YieldxyzProviderLogo"
import { YieldxyzTokensAndFiat } from "../../components/YieldxyzTokensAndFiat"
import { useYieldxyzManageModal } from "../useYieldxyzManageModal"
import { useYieldxyzManageWizard } from "../useYieldxyzManageWizard"

export const YieldxyzManageStepConfirm = () => {
  const { t } = useTranslation()
  const { close } = useYieldxyzManageModal()
  const wizard = useYieldxyzManageWizard()
  const { position, action, network, transaction, balance, isLoadingAction } = wizard
  const actionTitle = useActionTitle(action)

  if (!action && isLoadingAction) return <ActionCreatingShimmer />

  if (!position || !action) return null

  return (
    <RiskAnalysisProvider
      riskAnalysis={
        transaction?.platform === "ethereum" || transaction?.platform === "solana"
          ? transaction.riskAnalysis
          : undefined
      }
      containerId="earn-modal"
    >
      <WizardModalDialog className="size-full border-none" title={actionTitle} onCloseClick={close}>
        <YieldxyzConfirmBody wizard={wizard} networkId={position.networkId}>
          {!!balance && (
            <FormFieldSetRow label={t("Amount")}>
              <YieldxyzTokensAndFiat
                withLogo
                token={balance.token}
                amountRaw={balance.amountRaw}
                className="text-body-secondary"
                tokensClassName="text-body"
              />
            </FormFieldSetRow>
          )}
          <FormFieldSetRow label={t("Account")} valueClassName="h-full">
            <AccountDisplay
              address={position.address}
              ss58Format={network?.platform === "polkadot" ? network.prefix : undefined}
            />
          </FormFieldSetRow>
          <FormFieldSetSeparator />
          <FormFieldSetRow label={t("DeFi Product")} variant="small">
            <YieldxyzProductTitleDisplay product={position.product} />
          </FormFieldSetRow>
          <FormFieldSetRow label={t("Provider")} variant="small">
            <YieldxyzProviderDisplay providerId={position.product.providerId} />
          </FormFieldSetRow>
        </YieldxyzConfirmBody>
      </WizardModalDialog>
    </RiskAnalysisProvider>
  )
}

const ActionCreatingShimmer = () => {
  {
    const { t } = useTranslation()

    return (
      <div className="flex flex-col items-center gap-2 pt-64 text-body-secondary leading-[140%]">
        <LoaderIcon className="h-16 w-16 animate-spin-slow" />
        <div className="mt-4 font-bold text-base text-white opacity-70">
          {t("Preparing operation")}
        </div>
        <div className="font-normal text-sm opacity-70">{t("This shouldn't take long...")}</div>
      </div>
    )
  }
}

const useActionTitle = (action: ActionDto | null) => {
  const { t } = useTranslation()

  return useMemo(() => {
    if (!action) return t("Manage Position")

    switch (action.type) {
      case "CLAIM_REWARDS":
        return t("Claim Rewards")
      case "CLAIM_UNSTAKED":
        return t("Finalize Withdraw")
      case "RESTAKE_REWARDS":
        return t("Restake Rewards")
      case "DELEGATE":
        return t("Delegate Stake")
      case "MIGRATE":
        return t("Migrate")
      case "REBOND":
        return t("Rebond")
      case "RESTAKE":
        return t("Restake")
      case "REVOKE":
        return t("Revoke")
      case "REVOTE":
        return t("Revote")
      case "STAKE":
        return t("Stake")
      case "STAKE_LOCKED":
        return t("Stake Locked")
      case "UNLOCK_LOCKED":
        return t("Unlock")
      case "UNSTAKE":
        return t("Unstake")
      case "VERIFY_WITHDRAW_CREDENTIALS":
        return t("Verify Withdraw Credentials")
      case "VOTE":
        return t("Vote")
      case "VOTE_LOCKED":
        return t("Vote Locked")
      case "WITHDRAW":
        return t("Withdraw")
      case "WITHDRAW_ALL":
        return t("Withdraw All")
      default:
        return t("Manage Position")
    }
  }, [action, t])
}
