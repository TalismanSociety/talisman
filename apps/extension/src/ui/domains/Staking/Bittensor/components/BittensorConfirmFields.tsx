import { InfoIcon } from "@talismn/icons"
import { Toggle } from "@ui/components/Toggle"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useFeatureFlag } from "@ui/state/remoteConfig"
import { cn } from "@ui/util/cn"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useGetSeekDiscount } from "../../Seek/hooks/useGetSeekDiscount"
import { SeekGetFeeDiscountsDrawer } from "../../Seek/SeekGetFeeDiscountsDrawer"
import { MevShieldInfoDrawer } from "../BittensorBondModal/Drawers/BittensorMevShieldInfoDrawer"
import { useGetSubnetFee } from "../hooks/useGetSubnetFee"
import {
  HIGH_PRICE_IMPACT,
  TALISMAN_FEE_BITTENSOR,
  VERY_HIGH_PRICE_IMPACT,
} from "../utils/constants"

export const BittensorConfirmAlphaPriceValue: FC<{
  swapPrice?: string | bigint | null
  tokenId?: string
}> = ({ swapPrice, tokenId }) => {
  if (!tokenId) return null

  return (
    <TokensAndFiat
      planck={swapPrice ?? undefined}
      tokenId={tokenId}
      className="text-body-secondary"
      tokensClassName="text-body"
      noCountUp
    />
  )
}

export const BittensorConfirmPriceImpactValue: FC<{ priceImpact?: number }> = ({ priceImpact }) => {
  return (
    <span
      className={cn(
        "text-body",
        !!priceImpact && priceImpact >= HIGH_PRICE_IMPACT && "text-orange-500",
        !!priceImpact && priceImpact >= VERY_HIGH_PRICE_IMPACT && "text-red-500"
      )}
    >
      {priceImpact?.toFixed(2)}%
    </span>
  )
}

export const BittensorConfirmMevShieldLabel: FC<{ containerId: string }> = ({ containerId }) => {
  const { t } = useTranslation()
  const { isOpen, open, close } = useOpenClose()

  return (
    <>
      <button type="button" className="whitespace-nowrap hover:text-body" onClick={open}>
        <div>
          {t("MEV Shield")} <InfoIcon className="inline" />
        </div>
      </button>
      <MevShieldInfoDrawer isOpen={isOpen} onDismiss={close} containerId={containerId} />
    </>
  )
}

export const BittensorConfirmMevShieldValue: FC<{
  withMevShield: boolean
  isMevShieldDisabled: boolean
  isMevShieldFeatureDisabled: boolean
  setIsMevProtectionEnabled: (enabled: boolean) => void
}> = ({
  withMevShield,
  isMevShieldDisabled,
  isMevShieldFeatureDisabled,
  setIsMevProtectionEnabled,
}) => {
  const { t } = useTranslation()

  const toggle = (
    <Toggle
      variant="tiny"
      checked={withMevShield}
      disabled={isMevShieldDisabled}
      onChange={(e) => setIsMevProtectionEnabled(e.target.checked)}
    />
  )

  if (isMevShieldFeatureDisabled)
    return (
      <Tooltip>
        <TooltipTrigger>{toggle}</TooltipTrigger>
        <TooltipContent>{t("MEV Shield is temporarily disabled")}</TooltipContent>
      </Tooltip>
    )

  return toggle
}

const MAX_TOTAL_FEE_DISCOUNT = 1

export const BittensorConfirmTalismanFeeLabel: FC<{
  netuid?: number | null
  containerId: string
  direction: "taoToAlpha" | "alphaToTao"
  onCloseModal: () => void
}> = ({ netuid, containerId, direction, onCloseModal }) => {
  const { t } = useTranslation()
  const isSeekTaoDiscountEnabled = useFeatureFlag("SEEK_TAO_DISCOUNT")
  const { tier } = useGetSeekDiscount()
  const subnetFee = useGetSubnetFee({
    netuid: netuid ?? 0,
    direction,
  })

  const subnetFeeDiscount = useMemo(() => {
    if (subnetFee === TALISMAN_FEE_BITTENSOR) {
      return 0
    } else if (subnetFee === 0) {
      return MAX_TOTAL_FEE_DISCOUNT
    }
    const discountDiff = TALISMAN_FEE_BITTENSOR - subnetFee
    return discountDiff / TALISMAN_FEE_BITTENSOR
  }, [subnetFee])

  const totalFeeDiscount = useMemo(() => {
    if (subnetFeeDiscount === MAX_TOTAL_FEE_DISCOUNT) {
      return MAX_TOTAL_FEE_DISCOUNT
    }
    if (isSeekTaoDiscountEnabled) {
      return tier.discount + subnetFeeDiscount
    }
    return subnetFeeDiscount
  }, [subnetFeeDiscount, isSeekTaoDiscountEnabled, tier.discount])

  const totalDiscountPercent = useMemo(() => `${totalFeeDiscount * 100}%`, [totalFeeDiscount])
  const isSeekDrawerEnabled = useMemo(
    () => isSeekTaoDiscountEnabled && totalFeeDiscount < MAX_TOTAL_FEE_DISCOUNT,
    [isSeekTaoDiscountEnabled, totalFeeDiscount]
  )

  const { isOpen, open, close } = useOpenClose()

  return (
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
              : t("Talisman applies a {{fee}}% fee to each transaction.", {
                  fee: TALISMAN_FEE_BITTENSOR,
                })}
          </span>
        </TooltipContent>
      </Tooltip>
      {(totalFeeDiscount > 0 || isSeekTaoDiscountEnabled) && (
        <button
          type="button"
          className={cn(
            "rounded-[43px] bg-[#D5FF5C]/10 px-3 py-1",
            !isSeekDrawerEnabled && "cursor-default"
          )}
          onClick={isSeekDrawerEnabled ? open : undefined}
        >
          <div className="text-[#D5FF5C] text-tiny">
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
      <SeekGetFeeDiscountsDrawer
        isOpen={isOpen}
        onDismiss={close}
        onCloseModal={onCloseModal}
        containerId={containerId}
      />
    </div>
  )
}
