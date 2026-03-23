import { ArrowRightCircleIcon, ChevronRightIcon, XIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { type AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { IconButton } from "@ui/components/IconButton"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useRampsModal } from "@ui/domains/Ramps/useRampsModal"
import { useSwapModal } from "@ui/domains/Swap/hooks/useSwapModal"
import { useAccounts } from "@ui/state/accounts"
import { useAppState } from "@ui/state/app"
import { useFeatureFlag } from "@ui/state/remoteConfig"
import { closeIfEmbeddedPopup } from "@ui/util/closeIfEmbeddedPopup"
import { classNames, cn } from "@ui/util/cn"
import { IS_POPUP } from "@ui/util/constants"
import { type FC, type ReactNode, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { useSeekBenefitsModal } from "../SeekBenefits/SeekBenefitsModal"
import {
  GetStartedAddAccountIcon,
  GetStartedBuyIcon,
  GetStartedEyeIcon,
  GetStartedReceiveIcon,
  GetStartedSwapIcon,
  GetStartedTryItIcon,
} from "./icons"
import { useLearnMoreModal } from "./LearnMore"
import { useTryTalismanModal } from "./TryTalisman"

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
    onSeekClick,
  } = useGetStarted()

  const canBuy = useFeatureFlag("BUY_CRYPTO")
  const showSeekBenefits = useFeatureFlag("SEEK_BENEFITS")

  // ensure it appears if it was hidden and user deletes all accounts
  if (hasAccounts && isHidden) return null

  return (
    <div className="@container relative flex w-full flex-col gap-8 rounded-sm bg-black-secondary p-8">
      {hasAccounts && (
        <IconButton
          className="absolute top-6 right-6 text-body-disabled enabled:focus-visible:text-body-secondary enabled:hover:text-body-secondary"
          onClick={onDismissClick}
        >
          <XIcon />
        </IconButton>
      )}

      <div className="flex flex-col gap-2 text-body">
        <div className="font-bold @2xl:text-lg text-md leading-base">
          {hasAccounts ? t("Fund your account") : t("Get Started")}
        </div>
        <div className="@2xl:text-base text-xs leading-paragraph">
          {hasAccounts
            ? t("To begin your journey")
            : t("Add an account and add funds to get started")}
        </div>
      </div>

      {hasAccounts ? (
        <div className="grid grid-cols-3 gap-8">
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
          {canBuy && (
            <GetStartedActionButton
              label={t("Buy")}
              className="text-sm"
              iconTop={<GetStartedBuyIcon className="size-10" />}
              onClick={onBuyClick}
            />
          )}
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

      {IS_POPUP ? (
        <div className={cn("grid gap-8", showSeekBenefits ? "grid-cols-3" : "grid-cols-1")}>
          {showSeekBenefits && (
            <GetStartedActionButton
              className="col-span-2"
              label={t("SEEK Benefits")}
              iconTop={<GetStartedEyeIcon className="-ml-2 size-12" />}
              onClick={onSeekClick}
            />
          )}
          <GetStartedActionButton
            label={t("About")}
            iconTop={<ArrowRightCircleIcon className="-ml-2 size-12" />}
            onClick={onLearnMoreClick}
          />
        </div>
      ) : (
        <div className={cn("grid gap-8", showSeekBenefits ? "grid-cols-3" : "grid-cols-1")}>
          {showSeekBenefits && (
            <GetStartedActionButton
              label={t("SEEK Benefits")}
              iconTop={<GetStartedEyeIcon className="-ml-2 size-12" />}
              onClick={onSeekClick}
            />
          )}
          <GetStartedActionButton
            label={t("About Talisman")}
            description={t("Discover how Talisman can elevate your web3 journey")}
            className={cn("group", showSeekBenefits && "col-span-2")}
            iconRight={
              <ChevronRightIcon className="-mr-4 size-12 text-body-inactive group-hover:text-body-secondary" />
            }
            onClick={onLearnMoreClick}
          />
        </div>
      )}
    </div>
  )
}

const useGetStarted = () => {
  const ownedAccounts = useAccounts("owned")
  const hasAccounts = useMemo(() => !!ownedAccounts.length, [ownedAccounts])

  const navigate = useNavigate()
  const { open: onCopyAddressModal } = useCopyAddressModal()
  const { open: openSwapModal } = useSwapModal()
  const { open: openRamps } = useRampsModal()
  const { open: openLearnMoreModal } = useLearnMoreModal()
  const { open: openTryTalismanModal } = useTryTalismanModal()
  const { open: openSeekBenefits } = useSeekBenefitsModal()

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
    else openTryTalismanModal()
  }, [navigate, openTryTalismanModal])

  const onReceiveClick = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "receive" })

    onCopyAddressModal()
  }, [onCopyAddressModal])

  const onSwapClick = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "swap" })
    openSwapModal({})
  }, [openSwapModal])

  const onBuyClick = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "open ramps" })

    openRamps()
  }, [openRamps])

  const onLearnMoreClick = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "learn more" })

    if (IS_POPUP) navigate("/learn-more")
    else openLearnMoreModal()
  }, [navigate, openLearnMoreModal])

  const onDismissClick = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "dismiss get started" })
    setIsHidden(true)
  }, [setIsHidden])

  const onSeekClick = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "Seek Benefits" })
    openSeekBenefits()
  }, [openSeekBenefits])

  return {
    isHidden,
    hasAccounts,
    onAddAccountClick,
    onTryItClick,
    onSwapClick,
    onReceiveClick,
    onBuyClick,
    onDismissClick,
    onLearnMoreClick,
    onSeekClick,
  }
}

const GetStartedActionButton: FC<{
  label: ReactNode
  description?: ReactNode
  iconTop?: ReactNode
  iconRight?: ReactNode
  className?: string
  small?: boolean
  onClick: () => void
}> = ({ label, description, iconTop, iconRight, className, onClick }) => (
  <button
    type="button"
    className={classNames(
      "rounded-sm border border-disabled border-grey-700/40 bg-grey-800 @2xl:px-8 px-6 py-4 text-left @2xl:text-md text-base leading-paragraph hover:bg-grey-750 enabled:focus-visible:bg-grey-750",
      "flex w-full items-center gap-8 overflow-hidden",
      className
    )}
    onClick={onClick}
  >
    <div className="flex grow flex-col gap-4">
      {iconTop}
      <div className="flex w-full flex-col gap-1">
        <div className="truncate font-bold @2xl:text-base text-body text-sm">{label}</div>
        {description && (
          <div className="@2xl:text-sm text-body-secondary text-tiny">{description}</div>
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
