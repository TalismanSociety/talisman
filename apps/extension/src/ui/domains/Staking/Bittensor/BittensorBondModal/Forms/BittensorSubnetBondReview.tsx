import { EditIcon, InfoIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { useGetSeekDiscount } from "@ui/domains/Staking/Seek/hooks/useGetSeekDiscount"
import { SeekGetFeeDiscountsDrawer } from "@ui/domains/Staking/Seek/SeekGetFeeDiscountsDrawer"
import { STAKING_MODAL_CONTENT_CONTAINER_ID } from "@ui/domains/Staking/shared/ModalContent"
import { useAppState, useFeatureFlag } from "@ui/state"

import { TokensAndFiat } from "../../../../Asset/TokensAndFiat"
import { SapiSendButton } from "../../../../Transactions/SapiSendButton"
import { StakingAccountDisplay } from "../../../shared/StakingAccountDisplay"
import { StakingFeeEstimate } from "../../../shared/StakingFeeEstimate"
import { StakingUnbondingPeriod } from "../../../shared/StakingUnbondingPeriod"
import { useBittensorBondModal } from "../../hooks/useBittensorBondModal"
import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { useGetSubnetFee } from "../../hooks/useGetSubnetFee"
import {
  HIGH_PRICE_IMPACT,
  TALISMAN_FEE_BITTENSOR,
  VERY_HIGH_PRICE_IMPACT,
} from "../../utils/constants"
import { BittensorStakingModalHeader } from "../BittensorModalHeader"
import { BittensorModalLayout } from "../BittensorModalLayout"
import { BittensorSlippageDrawer } from "../Drawers/BittensorSlippageDrawer"
import { BittensorWarningDrawer } from "../Drawers/BittensorWarningDrawer"

const MAX_TOTAL_FEE_DISCOUNT = 1

export const BittensorSubnetBondReview = () => {
  const [isDisabled, setIsDisabled] = useState(true)
  const [hideWarning] = useAppState("hideBittensorSubnetStakeWarning")
  const [hasAckWarning, setHasAckWarning] = useState<boolean>(hideWarning || false)
  const isSeekTaoDiscountEnabled = useFeatureFlag("SEEK_TAO_DISCOUNT")

  const {
    nativeToken,
    dtaoToken,
    account,
    payload,
    amountIn,
    txMetadata,
    hotkey,
    netuid,
    feeToken,
    slippageDrawer,
    slippage,
    warningDrawer,
    isSubnetUnbond,
    talismanFee,
    swapPrice,
    errorFeeEstimate,
    amountOut,
    stakeDirection,
    priceImpact,
    onSubmitted,
    setStep,
  } = useBittensorBondWizard()
  const { t } = useTranslation()
  const { tier } = useGetSeekDiscount()
  const { seekDiscountDrawer } = useBittensorBondWizard()
  const { close } = useBittensorBondModal()
  const subnetFee = useGetSubnetFee({
    netuid: netuid ?? 0,
    direction: stakeDirection === "bond" ? "taoToAlpha" : "alphaToTao",
  })

  const { discount } = tier

  const subnetFeeDiscount = useMemo(() => {
    if (subnetFee === TALISMAN_FEE_BITTENSOR) {
      // No discount
      return 0
    } else if (subnetFee === 0) {
      // 100% discount
      return MAX_TOTAL_FEE_DISCOUNT
    } else {
      // Calculate discount percentage
      const discountDiff = TALISMAN_FEE_BITTENSOR - subnetFee
      return discountDiff / TALISMAN_FEE_BITTENSOR
    }
  }, [subnetFee])

  const totalFeeDiscount = useMemo(() => {
    if (subnetFeeDiscount === MAX_TOTAL_FEE_DISCOUNT) {
      // Discount cannot be greater than 100%
      return MAX_TOTAL_FEE_DISCOUNT
    } else if (isSeekTaoDiscountEnabled) {
      // Calculate total discount, combining subnet fee discount and seek discount
      return tier.discount + subnetFeeDiscount
    }
    // subnet fee discount only
    return subnetFeeDiscount
  }, [subnetFeeDiscount, isSeekTaoDiscountEnabled, tier.discount])

  const totalDiscountPercent = useMemo(() => `${totalFeeDiscount * 100}%`, [totalFeeDiscount])
  const isSeekDrawerEnabled = useMemo(
    () => isSeekTaoDiscountEnabled && totalFeeDiscount < MAX_TOTAL_FEE_DISCOUNT,
    [isSeekTaoDiscountEnabled, totalFeeDiscount],
  )

  const { isLoading } = useCombinedSubnetData()

  const { open } = slippageDrawer
  const { open: openWarningDrawer } = warningDrawer

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
          title={t("Confirm")}
          onBackClick={() => setStep("form")}
          withClose
        />
      }
      contentClassName="p-12 pt-0 flex flex-col w-full"
    >
      <h2 className="mb-12 text-center">
        {stakeDirection === "bond" ? t("You are Staking") : t("You are Unstaking")}
      </h2>
      <div className="space-y-[0.75rem]">
        <div className="bg-grey-900 text-body-secondary flex w-full flex-col rounded p-8">
          <div className="flex items-center justify-between gap-8 pb-2">
            <div className="whitespace-nowrap">{t("Amount")} </div>
            <div className="overflow-hidden">
              <TokensAndFiat
                tokenId={stakeDirection === "bond" ? nativeToken?.id : dtaoToken?.id}
                planck={amountIn!}
                noCountUp
                withLogo
                className="flex items-center"
                tokensClassName="text-body"
                logoClassName="size-12"
                fiatClassName="text-body-secondary"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-8 pt-2">
            <div className="whitespace-nowrap">{t("Account")} </div>
            <div className="overflow-hidden">
              <StakingAccountDisplay address={account.address} chainId={nativeToken?.networkId} />
            </div>
          </div>
          <div className="py-8">
            <hr className="text-grey-800" />
          </div>
          <div className="flex items-center justify-between gap-8 pb-2 text-xs">
            <div className="whitespace-nowrap">{t("Subnet")} </div>
            <div className="text-body truncate">{dtaoToken?.name}</div>
          </div>
          <div className="flex items-center justify-between gap-8 py-2 text-xs">
            <div className="whitespace-nowrap">{t("Validator")} </div>
            <div className="text-body truncate">
              <BittensorValidatorName hotkey={hotkey} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-8 py-2 text-xs">
            <div className="whitespace-nowrap">{t("Unbonding Period")} </div>
            <div className="text-body truncate">
              <StakingUnbondingPeriod chainId={nativeToken?.networkId} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-8 pt-2 text-xs">
            <div className="whitespace-nowrap">{t("Estimated amount")}</div>
            <div className="overflow-hidden">
              <TokensAndFiat
                planck={amountOut}
                tokenId={isSubnetUnbond ? nativeToken?.id : dtaoToken?.id}
                noCountUp
                tokensClassName="text-body"
              />
            </div>
          </div>
        </div>
        <div className="bg-grey-900 text-body-secondary flex w-full flex-col gap-2 rounded p-8 py-6">
          <div className="flex items-center justify-between gap-8 text-xs">
            <div className="whitespace-nowrap">{t("Alpha Price")} </div>
            <div className="text-body flex items-center gap-2">
              <TokensAndFiat
                planck={swapPrice!}
                tokenId={nativeToken?.id}
                tokensClassName="text-body"
                noCountUp
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-8 text-xs">
            <div className="whitespace-nowrap">{t("Price Impact")}</div>
            <div
              className={classNames(
                "text-body",
                !!priceImpact && priceImpact >= HIGH_PRICE_IMPACT && "text-orange-500",
                !!priceImpact && priceImpact >= VERY_HIGH_PRICE_IMPACT && "text-red-500",
              )}
            >
              {priceImpact?.toFixed(2)}%
            </div>
          </div>
          <div className="flex items-center justify-between gap-8 text-xs">
            <div className="whitespace-nowrap">{t("Slippage Tolerance")} </div>
            <div className="text-body flex items-center gap-2">
              <button
                type="button"
                onClick={open}
                className={
                  "flex cursor-pointer items-center gap-2 rounded-xl pl-2 text-xs font-light"
                }
              >
                <EditIcon />
                <div>{slippage.toFixed(2)}%</div>
              </button>
            </div>
          </div>
        </div>
        <div className="bg-grey-900 text-body-secondary flex w-full flex-col rounded p-8 py-6">
          <div className="flex items-center justify-between gap-8 pt-2 text-xs">
            <div className="whitespace-nowrap">{t("Estimated Fee")} </div>
            <FeeEstimate />
          </div>
          <div className="flex items-center justify-between gap-8 pt-2 text-xs">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div>{t("Talisman Fee")} </div>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon />
                </TooltipTrigger>
                <TooltipContent>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {subnetFee === 0
                      ? t("Talisman doesn’t apply any fee to this transaction.")
                      : t(`Talisman applies a ${TALISMAN_FEE_BITTENSOR}% fee to each transaction.`)}
                  </span>
                </TooltipContent>
              </Tooltip>
              {totalFeeDiscount > 0 && (
                <button
                  type="button"
                  className={classNames(
                    "rounded-[43px] bg-[#D5FF5C] bg-opacity-[0.1] px-3 py-1",
                    !isSeekDrawerEnabled && "cursor-default",
                  )}
                  onClick={isSeekDrawerEnabled ? seekDiscountDrawer.open : undefined}
                >
                  <div className="text-[1rem] text-[#D5FF5C]">
                    {totalFeeDiscount > 0 ? (
                      <>
                        {totalDiscountPercent} {t("Off Fees")}
                      </>
                    ) : (
                      t("Get Discount")
                    )}
                  </div>
                </button>
              )}
            </div>
            <StakingFeeEstimate
              plancks={talismanFee}
              tokenId={feeToken?.id}
              isLoading={isLoading}
              error={errorFeeEstimate}
              tokensClassName={discount > 0 && isSeekTaoDiscountEnabled ? "text-[#D5FF5C]" : ""}
              noCountUp
              noFiat
            />
          </div>
        </div>
      </div>
      <div className="grow"></div>
      {payload &&
        (!hasAckWarning ? (
          <Button primary onClick={openWarningDrawer}>
            {t("Confirm")}
          </Button>
        ) : (
          <SapiSendButton
            containerId="StakingModalDialog"
            label={stakeDirection === "bond" ? t("Stake") : t("Unstake")}
            payload={payload}
            onSubmitted={onSubmitted}
            txMetadata={txMetadata}
            disabled={isDisabled}
          />
        ))}
      <BittensorSlippageDrawer />
      <BittensorWarningDrawer setHasAckWarning={setHasAckWarning} />
      <SeekGetFeeDiscountsDrawer
        isOpen={seekDiscountDrawer.isOpen}
        onDismiss={seekDiscountDrawer.close}
        onCloseModal={close}
        containerId={STAKING_MODAL_CONTENT_CONTAINER_ID}
      />
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
