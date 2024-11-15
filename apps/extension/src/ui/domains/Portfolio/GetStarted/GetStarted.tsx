import { ChevronRightIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { TALISMAN_WEB_APP_SWAP_URL } from "extension-shared"
import { FC, ReactNode, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { IconButton } from "talisman-ui"

import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useBuyTokensModal } from "@ui/domains/Asset/Buy/useBuyTokensModal"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useAccounts, useAppState } from "@ui/state"
import { closeIfEmbeddedPopup } from "@ui/util/closeIfEmbeddedPopup"
import { IS_POPUP } from "@ui/util/constants"

import {
  GetStartedAddAccountIcon,
  GetStartedBuyIcon,
  GetStartedReceiveIcon,
  GetStartedSwapIcon,
  GetStartedTryItIcon,
} from "./icons"

export const GetStarted = () => {
  const { t } = useTranslation()
  const {
    isHidden,
    hasAccounts,
    onAddAccountClick,
    onTryItClick,
    onReceiveClick,
    onSwapClick,
    onBuyClick,
    onLearnMoreClick,
    onDismissClick,
  } = useGetStarted()

  // ensure it appears if it was hidden and user deletes all accounts
  if (hasAccounts && isHidden) return null

  return (
    <div className="@container bg-black-secondary relative flex w-full flex-col gap-8 rounded-sm p-8">
      {hasAccounts && (
        <IconButton
          className="text-body-disabled enabled:hover:text-body-secondary enabled:focus-visible:text-body-secondary absolute right-6 top-6"
          onClick={onDismissClick}
        >
          <XIcon />
        </IconButton>
      )}

      <div className="text-body flex flex-col gap-2">
        <div className="text-md @2xl:text-lg leading-base font-bold">
          {hasAccounts ? t("Fund your account") : t("Get Started")}
        </div>
        <div className="leading-paragraph @2xl:text-base text-xs">
          {hasAccounts
            ? t("To begin your journey across Polkadot and Ethereum")
            : t("Your launchpad to Polkadot and Ethereum")}
        </div>
      </div>

      {hasAccounts ? (
        <div className="gao-8 grid grid-cols-3 gap-8">
          <GetStartedActionButton
            label={t("Receive")}
            className="text-sm"
            iconTop={<GetStartedReceiveIcon className="-ml-1 size-10" />}
            onClick={onReceiveClick}
          />
          <GetStartedActionButton
            label={t("Swap")}
            className="text-sm"
            iconTop={<GetStartedSwapIcon className="size-10" />}
            onClick={onSwapClick}
          />
          <GetStartedActionButton
            label={t("Buy")}
            className="text-sm"
            iconTop={<GetStartedBuyIcon className="size-10" />}
            onClick={onBuyClick}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-8">
          <GetStartedActionButton
            label={t("Add account")}
            description={t("Create or import an existing account")}
            iconTop={<GetStartedAddAccountIcon className="-ml-2 size-12" />}
            onClick={onAddAccountClick}
          />
          <GetStartedActionButton
            label={t("Try it")}
            description={t("Follow a well-known account")}
            iconTop={<GetStartedTryItIcon className="size-12" />}
            onClick={onTryItClick}
          />
        </div>
      )}

      <GetStartedActionButton
        label={t("Learn More")}
        description={t("Discover how Talisman can elevate your web3 journey")}
        className="group"
        iconRight={
          <ChevronRightIcon className="text-body-inactive group-hover:text-body-secondary -mr-4 size-12" />
        }
        onClick={onLearnMoreClick}
      />
    </div>
  )
}

const useGetStarted = () => {
  const ownedAccounts = useAccounts("owned")
  const hasAccounts = useMemo(() => !!ownedAccounts.length, [ownedAccounts])

  const navigate = useNavigate()
  const { open: openBuyTokensModal } = useBuyTokensModal()
  const { open: onCopyAddressModal } = useCopyAddressModal()

  const [isHidden, setIsHidden] = useAppState("hideGetStarted")

  const onAddAccountClick = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "add account" })

    if (IS_POPUP) api.dashboardOpen("/accounts/add")
    else navigate("/accounts/add")

    closeIfEmbeddedPopup()
  }, [navigate])

  const onTryItClick = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "try talisman" })

    if (IS_POPUP) navigate("/try-talisman")
    else api.popupOpen("#/try-talisman") // TODO open in a modal
  }, [navigate])

  const onSwapClick = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "swap" })

    window.open(TALISMAN_WEB_APP_SWAP_URL, "_blank")

    closeIfEmbeddedPopup()
  }, [])

  const onReceiveClick = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "receive" })

    onCopyAddressModal()
  }, [onCopyAddressModal])

  const onBuyClick = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "add funds" })

    if (IS_POPUP) api.dashboardOpen(`/portfolio?buyTokens`)
    else openBuyTokensModal()

    closeIfEmbeddedPopup()
  }, [openBuyTokensModal])

  const onLearnMoreClick = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "learn more" })

    if (IS_POPUP) navigate("/learn-more")
    else api.popupOpen("#/learn-more")
  }, [navigate])

  const onDismissClick = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "dismiss get started" })

    setIsHidden(true)
  }, [setIsHidden])

  return {
    isHidden,
    hasAccounts,
    onAddAccountClick,
    onTryItClick,
    onSwapClick,
    onReceiveClick,
    onBuyClick,
    onLearnMoreClick,
    onDismissClick,
  }
}

const GetStartedActionButton: FC<{
  label: ReactNode
  description?: ReactNode
  iconTop?: ReactNode
  iconRight?: ReactNode
  className?: string
  onClick: () => void
}> = ({ label, description, iconTop, iconRight, className, onClick }) => (
  <button
    type="button"
    className={classNames(
      "border-disabled bg-grey-800 border-grey-700/40 hover:bg-grey-750 leading-paragraph enabled:focus-visible:bg-grey-750 @2xl:text-md rounded-sm border px-8 py-4 text-left text-base",
      "flex w-full items-center gap-8",
      className,
    )}
    onClick={onClick}
  >
    <div className="flex grow flex-col gap-4">
      {iconTop}
      <div className="flex w-full flex-col gap-1">
        <div className="text-body font-bold">{label}</div>
        {description && (
          <div className="text-body-secondary @2xl:text-sm text-[1rem]">{description}</div>
        )}
      </div>
    </div>
    {iconRight}
  </button>
)

const ANALYTICS_PAGE: AnalyticsPage = IS_POPUP
  ? {
      container: "Popup",
      feature: "Onboarding",
      featureVersion: 1,
      page: "Popup - No Accounts",
    }
  : {
      container: "Fullscreen",
      feature: "Onboarding",
      featureVersion: 1,
      page: "Dashboard - No Accounts",
    }
