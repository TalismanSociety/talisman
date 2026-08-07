import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { subDTaoTokenId } from "@talismn/chaindata-provider"
import { InfoIcon } from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"
import { formatDuration, intervalToDuration } from "date-fns"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { TokenLogo } from "../../../../Asset/TokenLogo"
import { TokensAndFiat } from "../../../../Asset/TokensAndFiat"
import { SapiSendButton } from "../../../../Transactions/SapiSendButton"
import { StakingAccountDisplay } from "../../../shared/StakingAccountDisplay"
import { StakingFeeEstimate } from "../../../shared/StakingFeeEstimate"
import { StakingUnbondingPeriod } from "../../../shared/StakingUnbondingPeriod"
import { BittensorClaimAlert } from "../../components/BittensorClaimAlert"
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
    claimOption,
    claimablePlancks,
    claimHoldDurationMs,
  } = useBittensorBondWizard()
  const { close } = useBittensorBondModal()
  const locale = useDateFnsLocale()

  const [isDisabled, setIsDisabled] = useState(true)

  const withClaim = stakeDirection === "unbond" && claimOption.includeClaim

  // claiming restarts the root stake hold window for the pair: the claimed TAO is staked
  // back onto root and locked, so the user must be warned before confirming
  const claimHoldWarning = useMemo(() => {
    if (!withClaim || !claimHoldDurationMs) return null
    const duration = formatDuration(intervalToDuration({ start: 0, end: claimHoldDurationMs }), {
      locale,
    })
    return t("After this claim, your staked {{symbol}} will be locked for another {{duration}}", {
      symbol: nativeToken?.symbol ?? "TAO",
      duration,
    })
  }, [withClaim, claimHoldDurationMs, locale, nativeToken?.symbol, t])

  const rootAlphaTokenId = useMemo(
    () => (nativeToken?.networkId ? subDTaoTokenId(nativeToken.networkId, 0) : null),
    [nativeToken?.networkId]
  )

  const txInfo: WalletTransactionInfo | undefined = useMemo(() => {
    if (!nativeToken?.id || !rootAlphaTokenId || amountIn === null || !hotkey) return undefined
    // Root staking: TAO -> ALPHA (netuid 0) for stake, ALPHA -> TAO for unstake
    const isStaking = stakeDirection === "bond"
    return {
      type: "bittensor-staking",
      fromTokenId: isStaking ? nativeToken.id : rootAlphaTokenId,
      toTokenId: isStaking ? rootAlphaTokenId : nativeToken.id,
      fromAmount: amountIn.toString(),
      toAmount: amountIn.toString(), // same amount for root staking (1:1 ratio)
      hotkey,
    }
  }, [nativeToken?.id, rootAlphaTokenId, amountIn, stakeDirection, hotkey])

  useEffect(() => {
    // enable confirm button 0.5 second after the screen is open, to ensure the user doesnt accidentally click it (ex: double click from prev screen)
    const timeout = setTimeout(() => {
      setIsDisabled(false)
    }, 500)
    return () => clearTimeout(timeout)
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
      <div className="flex w-full flex-col rounded bg-grey-900 p-8 text-body-secondary">
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
          <div className="truncate text-body">
            <BittensorValidatorName hotkey={hotkey} />
          </div>
        </div>
        {withClaim && (
          <div className="flex items-center justify-between gap-8 py-2 text-xs">
            <div className="whitespace-nowrap">{t("Claiming Rewards")} </div>
            <div className="truncate">
              <TokensAndFiat
                isBalance
                tokenId={nativeToken?.id}
                planck={claimablePlancks}
                noCountUp
                tokensClassName="text-body"
              />
            </div>
          </div>
        )}
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
            <div className="overflow-hidden text-body">
              <ValidatorApy />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between gap-8 py-2 text-xs">
          <div className="whitespace-nowrap">{t("Unbonding Period")} </div>
          <div className="truncate text-body">
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
      {claimHoldWarning && (
        <div className="mt-4">
          <BittensorClaimAlert>{claimHoldWarning}</BittensorClaimAlert>
        </div>
      )}
      <div className="grow"></div>
      {payload && (
        <SapiSendButton
          containerId="StakingModalDialog"
          label={stakeDirection === "bond" ? t("Stake") : t("Unstake")}
          payload={payload}
          onSubmitted={onSubmitted}
          txMetadata={txMetadata}
          txInfo={txInfo}
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
