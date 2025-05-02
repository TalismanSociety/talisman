import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import Tokens from "@ui/domains/Asset/Tokens"
import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"

import { TokenLogo } from "../../../../Asset/TokenLogo"
import { TokensAndFiat } from "../../../../Asset/TokensAndFiat"
import { SapiSendButton } from "../../../../Transactions/SapiSendButton"
import { BondPoolName } from "../../../shared/BondPoolName"
import { StakingAccountDisplay } from "../../../shared/StakingAccountDisplay"
import { StakingFeeEstimate } from "../../../shared/StakingFeeEstimate"
import { StakingUnbondingPeriod } from "../../../shared/StakingUnbondingPeriod"
import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { BittensorSelectButton } from "../BittensorSelectButton"

export const BittensorSubnetBondReview = () => {
  const [isDisabled, setIsDisabled] = useState(true)
  const {
    token,
    formatter,
    account,
    payload,
    txMetadata,
    poolId,
    netuid,
    feeToken,

    // alphaPrice,
    taoToAlphaTalismanFee,
    taoToAlphaConversionRate,
    isDynamicInfoLoading,
    isDynamicInfoError,
    expectedAlphaWithSlippage,
    onSubmitted,
  } = useBittensorBondWizard()
  const { t } = useTranslation()

  const { isLoading, subnetData } = useCombinedSubnetData()

  const { subnet_name, symbol } = subnetData?.[netuid || 0] ?? {}

  const selectedSubnetLabel = `${netuid} | ${subnet_name} ${symbol}`
  const label = netuid ? selectedSubnetLabel : "Subnet"

  useEffect(() => {
    // enable confirm button 0.5 second after the screen is open, to ensure the user doesnt accidentally click it (ex: double click from prev screen)
    setTimeout(() => {
      setIsDisabled(false)
    }, 500)
  }, [])

  if (!account) return null

  return (
    <div className="flex size-full flex-col">
      <h2 className="mb-16 mt-6 text-center">{t("You are staking")}</h2>
      <div className="space-y-[0.75rem]">
        <div className="bg-grey-900 text-body-secondary flex w-full flex-col rounded p-8">
          <div className="flex items-center justify-between gap-8 pb-2">
            <div className="whitespace-nowrap">{t("Amount")} </div>
            <div className="flex items-center gap-4 overflow-hidden">
              <TokenLogo tokenId={token?.id} className="shrink-0 text-lg" />
              <TokensAndFiat
                isBalance
                tokenId={token?.id}
                planck={formatter?.planck}
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
            <div className="whitespace-nowrap">{t("Subnet")} </div>
            <div className="text-body truncate">
              <BittensorSelectButton label={label} isLoading={isLoading} nextStep="select-subnet" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-8 pb-2 text-xs">
            <div className="whitespace-nowrap">{t("Validator")} </div>
            <div className="text-body truncate">
              <BondPoolName poolId={poolId} chainId={token?.chain?.id} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-8 py-2 text-xs">
            <div className="whitespace-nowrap">{t("Unbonding Period")} </div>
            <div className="text-body truncate">
              <StakingUnbondingPeriod chainId={token?.chain?.id} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-8 pt-2 text-xs">
            <div className="whitespace-nowrap">{t("Estimated amount")} </div>
            {/* <div>{`${expectedAlphaWithSlippage} SN${netuid} ${subnet_name} ${symbol}`}</div> */}
            <Tokens
              amount={expectedAlphaWithSlippage}
              decimals={token?.decimals}
              symbol={`SN${netuid} ${subnet_name} ${symbol}`}
            />
          </div>
        </div>
        <div className="bg-grey-900 text-body-secondary flex w-full flex-col rounded p-8">
          <div className="flex items-center justify-between gap-8 pt-2 text-xs">
            <div className="whitespace-nowrap">{t("Conversion Rate")} </div>
            <div className="flex items-center gap-2">
              <div>1 TAO =</div>
              <Tokens
                amount={taoToAlphaConversionRate}
                decimals={token?.decimals}
                symbol={symbol}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-8 pt-2 text-xs">
            <div className="whitespace-nowrap">{t("Slippage")} </div>
            <div>33%</div>
          </div>
        </div>
        <div className="bg-grey-900 text-body-secondary flex w-full flex-col rounded p-8">
          <div className="flex items-center justify-between gap-8 pt-2 text-xs">
            <div className="whitespace-nowrap">{t("Estimated Fee")} </div>
            <FeeEstimate />
          </div>
          <div className="flex items-center justify-between gap-8 pt-2 text-xs">
            <div className="whitespace-nowrap">{t("Talisman Fee")} </div>
            <StakingFeeEstimate
              plancks={taoToAlphaTalismanFee}
              tokenId={feeToken?.id}
              isLoading={isDynamicInfoLoading}
              error={isDynamicInfoError}
              noCountUp
            />
          </div>
        </div>
      </div>
      <div className="grow"></div>
      {payload && (
        <SapiSendButton
          containerId="StakingModalDialog"
          label={t("Stake")}
          payload={payload}
          onSubmitted={onSubmitted}
          txMetadata={txMetadata}
          disabled={isDisabled}
        />
      )}
    </div>
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
