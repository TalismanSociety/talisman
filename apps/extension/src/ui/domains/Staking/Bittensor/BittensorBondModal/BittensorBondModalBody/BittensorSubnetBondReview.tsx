import { InfoIcon, SettingsIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useEffect, useState } from "react"
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
import {
  DEFAULT_USER_MAX_SLIPPAGE,
  DTAO_LOGO,
  HIGH_SLIPPAGE,
  TALISMAN_FEE_BITTENSOR,
  VERY_HIGH_SLIPPAGE,
} from "../../utils/constants"
import { BittensorDelegatorNameButton } from "../BittensorDelegatorNameButton"
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
  } = useBittensorBondWizard()
  const { t } = useTranslation()
  const { tier } = useGetSeekDiscount()
  const { seekDiscountDrawer } = useBittensorBondWizard()
  const { close } = useBittensorBondModal()

  const { discount } = tier
  const discountPercent = `${tier.discount * 100}%`

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
    <div className="flex size-full flex-col">
      <h2 className="mb-16 mt-6 text-center">
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
                    {t(`Talisman applies a ${TALISMAN_FEE_BITTENSOR}% fee to each transaction.`)}
                  </span>
                </TooltipContent>
              </Tooltip>
              {isSeekTaoDiscountEnabled && (
                <button
                  type="button"
                  className="rounded-[43px] bg-[#D5FF5C] bg-opacity-[0.1] px-3 py-1"
                  onClick={seekDiscountDrawer.open}
                >
                  <div className="text-[1rem] text-[#D5FF5C]">
                    {discount ? (
                      <>
                        {discountPercent} {t("Off Fees")}
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
