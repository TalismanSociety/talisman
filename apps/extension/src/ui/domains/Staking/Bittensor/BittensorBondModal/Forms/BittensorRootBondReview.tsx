import { InfoIcon } from "@talismn/icons"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"

import { TokenLogo } from "../../../../Asset/TokenLogo"
import { TokensAndFiat } from "../../../../Asset/TokensAndFiat"
import { SapiSendButton } from "../../../../Transactions/SapiSendButton"
import { StakingAccountDisplay } from "../../../shared/StakingAccountDisplay"
import { StakingFeeEstimate } from "../../../shared/StakingFeeEstimate"
import { StakingUnbondingPeriod } from "../../../shared/StakingUnbondingPeriod"
import { BittensorStakingModalHeader } from "../../components/BittensorModalHeader"
import { BittensorModalLayout } from "../../components/BittensorModalLayout"
import { ValidatorApy } from "../../components/ValidatorApy"
import { useBittensorBondModal } from "../../hooks/useBittensorBondModal"
import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"

export const BittensorRootBondReview = () => {
  const { t } = useTranslation()
  const {
    nativeToken,
    amountIn,
    account,
    onSubmitted,
    payload,
    txMetadata,
    hotkey,
    stakeDirection,
    setStep,
  } = useBittensorBondWizard()
  const { close } = useBittensorBondModal()

  const [isDisabled, setIsDisabled] = useState(true)

  useEffect(() => {
    // enable confirm button 0.5 second after the screen is open, to ensure the user doesnt accidentally click it (ex: double click from prev screen)
    setTimeout(() => {
      setIsDisabled(false)
    }, 500)
  }, [])

  if (!account) return null

  return (
    <BittensorModalLayout
      header={
        <BittensorStakingModalHeader
          onCloseModal={close}
          title={stakeDirection === "bond" ? t("Confirm Staking") : t("Confirm Unstaking")}
          onBackClick={() => setStep("form")}
          withClose
        />
      }
      contentClassName="p-12 pt-0 flex flex-col w-full"
    >
      <div className="bg-grey-900 text-body-secondary flex w-full flex-col rounded p-8">
        <div className="flex items-center justify-between gap-8 pb-2">
          <div className="whitespace-nowrap">{t("Amount")} </div>
          <div className="flex items-center gap-4 overflow-hidden">
            <TokenLogo tokenId={nativeToken?.id} className="shrink-0 text-lg" />
            <TokensAndFiat
              isBalance
              tokenId={nativeToken?.id}
              planck={amountIn ?? 0n}
              noCountUp
              tokensClassName="text-body"
              fiatClassName="text-body-secondary"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-8 pt-2">
          <div className="whitespace-nowrap">{t("Account")} </div>
          <div className="flex items-center gap-4 overflow-hidden">
            <StakingAccountDisplay address={account.address} chainId={nativeToken?.networkId} />
          </div>
        </div>
        <div className="py-8">
          <hr className="text-grey-800" />
        </div>
        <div className="flex items-center justify-between gap-8 pb-2 text-xs">
          <div className="whitespace-nowrap">{t("Validator")} </div>
          <div className="text-body truncate">
            <BittensorValidatorName hotkey={hotkey} />
          </div>
        </div>
        {stakeDirection === "bond" && (
          <div className="flex items-center justify-between gap-8 py-2 text-xs">
            <div className="flex items-center gap-1 whitespace-nowrap">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    {t("APY")}
                    <InfoIcon />
                  </div>
                </TooltipTrigger>
                <TooltipContent>{t("Estimated Annual Percentage Yield (APY)")}</TooltipContent>
              </Tooltip>
            </div>
            <div className="text-body overflow-hidden">
              <ValidatorApy />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between gap-8 py-2 text-xs">
          <div className="whitespace-nowrap">{t("Unbonding Period")} </div>
          <div className="text-body truncate">
            <StakingUnbondingPeriod chainId={nativeToken?.networkId} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-8 pt-2 text-xs">
          <div className="whitespace-nowrap">{t("Estimated Fee")} </div>
          <div>
            <FeeEstimate />
          </div>
        </div>
      </div>
      <div className="grow"></div>
      {payload && (
        <SapiSendButton
          containerId="StakingModalDialog"
          label={stakeDirection === "bond" ? t("Stake") : t("Unstake")}
          payload={payload}
          onSubmitted={onSubmitted}
          txMetadata={txMetadata}
          disabled={isDisabled}
        />
      )}
    </BittensorModalLayout>
  )
}

const FeeEstimate = () => {
  const { feeEstimate, feeToken, isLoadingFeeEstimate, errorFeeEstimate } = useBittensorBondWizard()

  return (
    <StakingFeeEstimate
      plancks={feeEstimate}
      tokenId={feeToken?.id}
      isLoading={isLoadingFeeEstimate}
      error={errorFeeEstimate}
      noCountUp
    />
  )
}
