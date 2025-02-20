import { AlertCircleIcon } from "@talismn/icons"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { TokenLogo } from "../../Asset/TokenLogo"
import { TokensAndFiat } from "../../Asset/TokensAndFiat"
import { SapiSendButton } from "../../Transactions/SapiSendButton"
import { BondPoolName } from "../shared/BondPoolName"
import { StakingAccountDisplay } from "../shared/StakingAccountDisplay"
import { StakingFeeEstimate } from "../shared/StakingFeeEstimate"
import { useNomPoolWithdrawWizard } from "./useNomPoolWithdrawWizard"

export const NomPoolWithdrawReview = () => {
  const { t } = useTranslation()
  const {
    token,
    amountToWithdraw,
    account,
    onSubmitted,
    payload,
    txMetadata,
    feeToken,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    errorMessage,
    poolId,
  } = useNomPoolWithdrawWizard()

  if (!account) return null

  return (
    <div className="flex size-full flex-col">
      <h2 className="mb-24 mt-8 text-center">{t("You are withdrawing")}</h2>
      <div className="bg-grey-900 text-body-secondary flex w-full flex-col rounded p-8">
        <div className="flex items-center justify-between gap-8 pb-2">
          <div className="whitespace-nowrap">{t("Amount")} </div>
          <div className="flex items-center gap-4 overflow-hidden">
            <TokenLogo tokenId={token?.id} className="shrink-0 text-lg" />
            <TokensAndFiat
              isBalance
              tokenId={token?.id}
              planck={amountToWithdraw?.planck}
              noCountUp
              tokensClassName="text-body"
              fiatClassName="text-body-secondary"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-8 pt-2">
          <div className="whitespace-nowrap">{t("Account")} </div>
          <div className="flex items-center gap-4 overflow-hidden">
            <StakingAccountDisplay address={account.address} chainId={token?.chain?.id} />
          </div>
        </div>
        <div className="py-8">
          <hr className="text-grey-800" />
        </div>
        <div className="flex items-center justify-between gap-8 pb-2 text-xs">
          <div className="whitespace-nowrap">{t("Pool")} </div>
          <div className="text-body truncate">
            <BondPoolName poolId={poolId} chainId={token?.chain?.id} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-8 pt-2 text-xs">
          <div className="whitespace-nowrap">{t("Estimated Fee")} </div>
          <div>
            <StakingFeeEstimate
              plancks={feeEstimate}
              tokenId={feeToken?.id}
              isLoading={isLoadingFeeEstimate}
              error={errorFeeEstimate}
              noCountUp
            />
          </div>
        </div>
      </div>
      <div className="grow"></div>
      {!!errorMessage && (
        <div className="text-alert-warn bg-grey-900 my-8 flex w-full items-center gap-5 rounded-sm px-5 py-6 text-xs">
          <AlertCircleIcon className="shrink-0 text-lg" />
          <div>{errorMessage}</div>
        </div>
      )}
      {payload ? (
        <SapiSendButton
          containerId="StakingModalDialog"
          label={t("Withdraw")}
          payload={payload}
          onSubmitted={onSubmitted}
          txMetadata={txMetadata}
        />
      ) : (
        <Button disabled primary>
          {t("Withdraw")}
        </Button>
      )}
    </div>
  )
}
