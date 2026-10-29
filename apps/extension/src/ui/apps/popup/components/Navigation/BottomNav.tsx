import {
  CloseIcon,
  HistoryIcon,
  MenuIcon,
  RepeatIcon,
  TalismanHandIcon,
  TrendingUpIcon,
} from "@talismn/icons"
import { useSwapModal } from "@ui/domains/Swap/hooks/useSwapModal"
import { useMnemonicsAllBackedUp } from "@ui/hooks/useMnemonicsAllBackedUp"
import { usePopupNavOpenClose } from "@ui/hooks/usePopupNavOpenClose"
import { cn } from "@ui/util/cn"
import { type FC, type ReactNode, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useMatch, useNavigate } from "react-router-dom"

import {
  QuickSettingsModal,
  QuickSettingsOverlay,
  useQuickSettingsOpenClose,
} from "./QuickSettings"

export const BottomNav = () => {
  const navigate = useNavigate()
  const { open } = usePopupNavOpenClose()
  const { close: closeQuickSettings, isOpen: isQuickSettingsOpen } = useQuickSettingsOpenClose()

  const handleHomeClick = useCallback(() => {
    navigate("/portfolio")
    closeQuickSettings()
  }, [closeQuickSettings, navigate])

  const handleTxHistoryClick = useCallback(() => {
    navigate("/tx-history")
    closeQuickSettings()
  }, [closeQuickSettings, navigate])

  const handleEarnClick = useCallback(() => {
    navigate("/earn")
    closeQuickSettings()
  }, [closeQuickSettings, navigate])

  const { open: openSwapModal } = useSwapModal()
  const handleSwapClick = useCallback(() => {
    openSwapModal({ entry: "bottom_nav" })
    closeQuickSettings()
  }, [closeQuickSettings, openSwapModal])

  const handleMoreClick = useCallback(() => {
    open()
  }, [open])

  const allBackedUp = useMnemonicsAllBackedUp()

  const { t } = useTranslation()

  return (
    <>
      <div className="h-32 shrink-0">{/* Placeholder for nav height */}</div>
      <QuickSettingsOverlay />

      <div className="absolute bottom-0 left-0 z-20 flex w-full flex-col justify-center gap-6 px-8 pb-6">
        <QuickSettingsModal />
        <div
          className={cn(
            "flex h-13 w-full items-center justify-between rounded border border-grey-800 bg-black/90 px-7 backdrop-blur-[2px]"
          )}
        >
          <NavButton
            label={t("Portfolio")}
            icon={TalismanHandIcon}
            onClick={handleHomeClick}
            route="/portfolio/*"
          />
          <NavButton
            label={t("Earn")}
            icon={TrendingUpIcon}
            onClick={handleEarnClick}
            route="/earn/*"
          />
          <NavButton label={t("Swap")} icon={RepeatIcon} onClick={handleSwapClick} />
          <NavButton
            label={t("History")}
            icon={HistoryIcon}
            onClick={handleTxHistoryClick}
            route="/tx-history"
          />
          {isQuickSettingsOpen ? (
            <NavButton
              label={t("Close")}
              icon={CloseIcon}
              onClick={closeQuickSettings}
              className="text-white!"
            />
          ) : (
            <NavButton
              label={t("More")}
              icon={MenuIcon}
              onClick={handleMoreClick}
              withBadge={!allBackedUp}
            />
          )}
        </div>
      </div>
    </>
  )
}

const NavButton: FC<{
  label: ReactNode
  icon: FC<{ className?: string }>
  className?: string
  withBadge?: boolean
  route?: string
  onClick: () => void
}> = ({ label, icon: Icon, withBadge, route, className, onClick }) => {
  const routeMatch = useMatch(route ?? "")

  return (
    <button
      type="button"
      className={cn(
        "group",
        "h-20 w-20 text-body-disabled",
        "enabled:hover:text-body-secondary",
        "enabled:focus-visible:border",
        routeMatch && "text-body!",
        className
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "flex w-full flex-col items-center justify-center gap-[0.0938rem] overflow-visible",
          "translate-y-4 transition-transform group-hover:translate-y-0"
        )}
      >
        {withBadge ? (
          <div className="relative size-10 shrink-0">
            <Icon className="size-10" />
            <div className="absolute -top-1 -right-1 size-3 rounded-full bg-primary"></div>
          </div>
        ) : (
          <Icon className="size-10 shrink-0" />
        )}
        <div
          className={cn(
            "text-tiny leading-paragraph",
            "text-nowrap opacity-0 transition-opacity group-hover:opacity-100"
          )}
        >
          {label}
        </div>
      </div>
    </button>
  )
}
