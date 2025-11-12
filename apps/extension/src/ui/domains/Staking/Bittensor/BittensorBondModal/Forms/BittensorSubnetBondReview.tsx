import { InfoIcon, SettingsIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useCombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { useGetSeekDiscount } from "@ui/domains/Staking/Seek/hooks/useGetSeekDiscount"
import { SeekGetFeeDiscountsDrawer } from "@ui/domains/Staking/Seek/SeekGetFeeDiscountsDrawer"
import { STAKING_MODAL_CONTENT_CONTAINER_ID } from "@ui/domains/Staking/shared/ModalContent"
import { useAppState, useFeatureFlag } from "@ui/state"

import { TokenLogo } from "../../../../Asset/TokenLogo"
import { TokensAndFiat } from "../../../../Asset/TokensAndFiat"
import { SapiSendButton } from "../../../../Transactions/SapiSendButton"
import { StakingAccountDisplay } from "../../../shared/StakingAccountDisplay"
import { StakingFeeEstimate } from "../../../shared/StakingFeeEstimate"
import { StakingUnbondingPeriod } from "../../../shared/StakingUnbondingPeriod"
import { useBittensorBondModal } from "../../hooks/useBittensorBondModal"
import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { useGetSubnetFee } from "../../hooks/useGetSubnetFee"
import {
  DEFAULT_USER_MAX_SLIPPAGE,
  DTAO_LOGO,
  HIGH_SLIPPAGE,
  TALISMAN_FEE_BITTENSOR,
  VERY_HIGH_SLIPPAGE,
} from "../../utils/constants"
import { BittensorDelegatorNameButton } from "../BittensorDelegatorNameButton"
import { BittensorStakingModalHeader } from "../BittensorModalHeader"
import { BittensorModalLayout } from "../BittensorModalLayout"
import { BittensorSelectButton } from "../BittensorSelectButton"
import { BittensorSlippageDrawer } from "../Drawers/BittensorSlippageDrawer"
import { BittensorWarningDrawer } from "../Drawers/BittensorWarningDrawer"

export const BittensorSubnetBondReview = () => {
  const [isDisabled, setIsDisabled] = useState(true)
  const [hideWarning] = useAppState("hideBittensorSubnetStakeWarning")
  const [hasAckWarning, setHasAckWarning] = useState<boolean>(hideWarning || false)
  const isSeekTaoDiscountEnabled = useFeatureFlag("SEEK_TAO_DISCOUNT")

  const {
    nativeToken,
    amountToStake,
    account,
    payload,
    isSlippageValid,
    txMetadata,
    hotkey,
    netuid,
    selectedSubnet,
    feeToken,
    slippageDrawer,
    warningDrawer,
    slippage,
    userMaxSlippage,
    isSubnetUnbond,
    talismanFee,
    taoToAlphaConversionRate,
    isDynamicInfoLoading,
    isDynamicInfoError,
    expectedAlphaWithSlippage,
    stakeDirection,
    amountToStakeAlpha,
    estimatedAmountToStake,
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
      return 1
    } else {
      // Calculate discount percentage
      const discountDiff = TALISMAN_FEE_BITTENSOR - subnetFee
      return (discountDiff * 1) / TALISMAN_FEE_BITTENSOR
    }
  }, [subnetFee])

  const totalFeeDiscount = useMemo(() => {
    if (subnetFeeDiscount === 1) {
      // Discount cannot be greater than 100%
      return 1
    } else if (isSeekTaoDiscountEnabled) {
      // Calculate total discount, combining subnet fee discount and seek discount
      return tier.discount + subnetFeeDiscount
    }
    // subnet fee discount only
    return subnetFeeDiscount
  }, [subnetFeeDiscount, isSeekTaoDiscountEnabled, tier.discount])

  const totalDiscountPercent = `${totalFeeDiscount * 100}%`

  const { isLoading } = useCombinedSubnetData()

  const { open } = slippageDrawer
  const { open: openWarningDrawer } = warningDrawer

  const { subnet_name, symbol } = selectedSubnet

  const selectedSubnetLabel = `SN${netuid} ${subnet_name} ${symbol}`
  const label = netuid ? selectedSubnetLabel : "Subnet"

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
            <div className="flex items-center gap-4 overflow-hidden">
              {isSubnetUnbond ? (
                <>
                  <AssetLogo url={DTAO_LOGO} className="shrink-0 text-lg" />
                  <Tokens
                    amount={amountToStakeAlpha?.tokens}
                    symbol={selectedSubnetLabel}
                    className="text-body truncate"
                  />
                </>
              ) : (
                <>
                  <TokenLogo tokenId={nativeToken?.id} className="shrink-0 text-lg" />
                  <TokensAndFiat
                    isBalance
                    tokenId={nativeToken?.id}
                    planck={amountToStake?.planck}
                    noCountUp
                    tokensClassName="text-body"
                    fiatClassName="text-body-secondary"
                  />
                </>
              )}
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
            <div className="whitespace-nowrap">{t("Subnet")} </div>
            <div className="text-body truncate">
              <BittensorSelectButton label={label} isLoading={isLoading} nextStep="select-subnet" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-8 pb-2 text-xs">
            <div className="whitespace-nowrap">{t("Validator")} </div>
            <div className="text-body truncate">
              <BittensorDelegatorNameButton hotkey={hotkey} />
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
            {isSubnetUnbond ? (
              <Tokens
                amount={estimatedAmountToStake?.tokens}
                decimals={nativeToken?.decimals}
                symbol={nativeToken?.symbol}
                className="text-body truncate"
              />
            ) : (
              <Tokens
                amount={expectedAlphaWithSlippage}
                decimals={nativeToken?.decimals}
                symbol={`SN${netuid} ${subnet_name} ${symbol}`}
                className="text-body truncate"
              />
            )}
          </div>
        </div>
        <div className="bg-grey-900 text-body-secondary flex w-full flex-col rounded p-8">
          <div className="flex items-center justify-between gap-8 pt-2 text-xs">
            <div className="whitespace-nowrap">{t("Conversion Rate")} </div>
            <div className="text-body flex items-center gap-2">
              <div>1 TAO =</div>
              <Tokens
                amount={taoToAlphaConversionRate}
                decimals={nativeToken?.decimals}
                symbol={symbol}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-8 pt-2 text-xs">
            <div className="whitespace-nowrap">{t("Slippage")}</div>
            <div
              className={classNames(
                "text-body flex items-center gap-2",
                ((slippage >= HIGH_SLIPPAGE && slippage < VERY_HIGH_SLIPPAGE) ||
                  !isSlippageValid) &&
                  "text-orange-500",
                slippage >= VERY_HIGH_SLIPPAGE && "text-red-500",
              )}
            >
              <button
                onClick={open}
                className={
                  "bg-pill hover:bg-grey-700 flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-light"
                }
              >
                <SettingsIcon />
                <div>{userMaxSlippage !== DEFAULT_USER_MAX_SLIPPAGE ? t("Custom") : t("Auto")}</div>
              </button>
              <div>{slippage}%</div>
            </div>
          </div>
        </div>
        <div className="bg-grey-900 text-body-secondary flex w-full flex-col rounded p-8">
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
                    !isSeekTaoDiscountEnabled && "cursor-default",
                  )}
                  onClick={isSeekTaoDiscountEnabled ? seekDiscountDrawer.open : undefined}
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
              isLoading={isDynamicInfoLoading}
              error={isDynamicInfoError}
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
            disabled={isDisabled || !isSlippageValid}
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
