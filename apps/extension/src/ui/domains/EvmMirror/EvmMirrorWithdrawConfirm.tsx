import { ModalDialog } from "@ui/components/ModalDialog"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { StakingAccountDisplay } from "@ui/domains/Staking/shared/StakingAccountDisplay"
import { StakingFeeEstimate } from "@ui/domains/Staking/shared/StakingFeeEstimate"
import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import { flows } from "@ui/hooks/analytics/flows"
import { shortenAddress } from "@ui/util/shortenAddress"
import type { FC, ReactNode } from "react"
import { useTranslation } from "react-i18next"

import {
  EVM_MIRROR_WITHDRAW_MODAL_CONTAINER_ID,
  useEvmMirrorWithdrawWizard,
} from "./useEvmMirrorWithdrawWizard"

const SummaryRow: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
  <div className="flex h-10 items-center justify-between gap-8">
    <span className="whitespace-nowrap text-body-secondary">{label}</span>
    <span className="truncate text-body">{children}</span>
  </div>
)

export const EvmMirrorWithdrawConfirm = () => {
  const { t } = useTranslation()
  const {
    address,
    token,
    h160,
    validPlancks,
    errorMessage,
    payload,
    txMetadata,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    setStep,
    close,
    onSubmitted,
  } = useEvmMirrorWithdrawWizard()

  if (!address || !token || !h160 || !validPlancks) return null

  return (
    <ModalDialog
      variant="wizard"
      title={t("Withdraw EVM Balance")}
      contentClassName="size-full flex flex-col overflow-hidden"
      onBackClick={() => setStep("amount")}
      onCloseClick={close}
    >
      <ScrollContainer className="grow" innerClassName="flex w-full flex-col gap-8">
        <h2 className="mb-4 text-center font-bold text-md">{t("Review transaction")}</h2>

        <div className="flex flex-col gap-4 rounded bg-grey-900 px-8 py-6 text-sm">
          <SummaryRow label={t("Amount")}>
            <TokensAndFiat
              planck={validPlancks}
              tokenId={token.id}
              noCountUp
              tokensClassName="text-body"
            />
          </SummaryRow>
          <SummaryRow label={t("From EVM address")}>{shortenAddress(h160, 6, 4)}</SummaryRow>
          <SummaryRow label={t("To")}>
            <StakingAccountDisplay
              address={address}
              chainId={token.networkId}
              className="text-sm"
            />
          </SummaryRow>
          <SummaryRow label={t("Network fee")}>
            <StakingFeeEstimate
              plancks={feeEstimate}
              tokenId={token.id}
              isLoading={isLoadingFeeEstimate}
              error={errorFeeEstimate}
              noCountUp
            />
          </SummaryRow>
        </div>

        {errorMessage && <div className="text-center text-alert-error text-sm">{errorMessage}</div>}
      </ScrollContainer>

      <SapiSendButton
        containerId={EVM_MIRROR_WITHDRAW_MODAL_CONTAINER_ID}
        label={t("Withdraw")}
        payload={payload}
        txMetadata={txMetadata}
        onSubmitted={onSubmitted}
        onError={flows.evm_withdraw.failed}
        disabled={!payload}
        className="shrink-0"
      />
    </ModalDialog>
  )
}
