import imgFundWallet from "@talisman/theme/images/fund-wallet.png"
import { classNames } from "@talismn/util"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"

import { useBuyTokensModal } from "../../Asset/Buy/BuyTokensModalContext"
import { useCopyAddressModal } from "../../CopyAddress"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Account Funding",
  featureVersion: 1,
  page: "Dashboard - Empty state",
}

export const FundYourWallet = () => {
  const { t } = useTranslation()
  useAnalyticsPageView(ANALYTICS_PAGE)
  const showBuyCryptoButton = useIsFeatureEnabled("BUY_CRYPTO")
  const { open: openBuyModal } = useBuyTokensModal()
  const { open: openCopyAddressModal } = useCopyAddressModal()

  const handleReceiveClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "open receive",
    })
    openCopyAddressModal({ mode: "receive" })
  }, [openCopyAddressModal])

  const handleBuyClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Buy crypto button",
    })
    openBuyModal()
  }, [openBuyModal])

  return (
    <div className="text-body-secondary flex w-[31.8rem] flex-col items-center gap-12 text-center 2xl:mt-[3rem] 2xl:scale-125">
      <div className="text-md text-white">{t("Fund your wallet")}</div>
      <div>
        <img height={124} src={imgFundWallet} alt="" />
      </div>
      <div>{t("This is where you'll see your balances.")}</div>
      <div>{t("Get started with some crypto so you can start using apps.")}</div>
      <div className="grid w-full grid-cols-2 gap-4 text-sm">
        <button
          className={classNames(
            "border-body text-body hover:bg-body hover:text-body-black h-16 rounded-xl border"
          )}
          onClick={handleReceiveClick}
        >
          {t("Receive Funds")}
        </button>
        {showBuyCryptoButton && (
          <button
            className={classNames(
              "bg-primary text-body-black h-16 rounded-xl opacity-90 hover:opacity-100"
            )}
            onClick={handleBuyClick}
          >
            {t("Buy Crypto")}
          </button>
        )}
      </div>
    </div>
  )
}
