import type { Account } from "@core/domains/keyring/exports"
import { ChevronRightIcon, ExpandIcon, PopoutIcon } from "@talismn/icons"
import { TalismanOrbRectangle } from "@talismn/orb"
import { api } from "@ui/api"
import { TotalFiatBalance } from "@ui/apps/popup/components/TotalFiatBalance"
import { Coachmark } from "@ui/components/Coachmark"
import { IconButton } from "@ui/components/IconButton"
import { useReportAccountSwitched } from "@ui/hooks/analytics/portfolio"
import { useHoverDirty } from "@ui/hooks/reactUseCompat"
import { useOpenFullscreen } from "@ui/hooks/useOpenFullscreen"
import { cn } from "@ui/util/cn"
import { IS_EMBEDDED_POPUP } from "@ui/util/constants"
import { type FC, useCallback, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

export const AllAccountsHeader: FC<{ accounts: Account[] }> = ({ accounts }) => {
  const navigate = useNavigate()
  const reportAccountSwitched = useReportAccountSwitched()
  const handleClick = useCallback(() => {
    navigate("/portfolio/tokens")
    reportAccountSwitched("all")
  }, [navigate, reportAccountSwitched])
  const ref = useRef<HTMLDivElement>(null)
  const isHovered = useHoverDirty(ref)
  const disabled = useMemo(() => !accounts.length, [accounts.length])

  return (
    <div ref={ref} className="relative h-35 w-full">
      <button
        type="button"
        className={cn(
          "flex size-full items-center justify-end gap-4 overflow-hidden rounded-sm p-6 text-lg",
          "bg-black-secondary text-body-secondary transition-colors duration-75",
          !disabled && "hover:text-body"
        )}
        onClick={!disabled ? handleClick : undefined}
        disabled={disabled}
      >
        {!disabled && !!accounts?.[0]?.address && (
          <TalismanOrbRectangle
            seed={accounts[0].address}
            className="absolute top-0 left-0 z-0 size-full select-none rounded-sm opacity-30"
          />
        )}
        {!disabled && <ChevronRightIcon className="z-10" />}
      </button>
      <TotalFiatBalance
        className="pointer-events-none absolute top-0 left-0 size-full p-6"
        mouseOver={isHovered}
        disabled={disabled}
      />
      <div className="absolute top-3 right-3 flex">
        <FullscreenButton />
        {IS_EMBEDDED_POPUP && <PopoutButton />}
      </div>
    </div>
  )
}

const PopoutButton: FC = () => {
  const handleClick = useCallback(() => {
    api.popupOpen("#/portfolio")
    window.close()
  }, [])

  return (
    <IconButton className="p-3 text-base" onClick={handleClick}>
      <PopoutIcon />
    </IconButton>
  )
}

const FullscreenButton: FC = () => {
  const { t } = useTranslation()
  const handleClick = useOpenFullscreen()

  return (
    <Coachmark
      id="popup_fullscreen_moved"
      title={t("Expand has moved here")}
      description={
        IS_EMBEDDED_POPUP
          ? t(
              "Open Talisman in a full tab from the top right, or use the adjacent icon for a separate window."
            )
          : t("Open Talisman in a full tab from the top right.")
      }
    >
      <IconButton className="p-3 text-base" onClick={handleClick} aria-label={t("Fullscreen")}>
        <ExpandIcon />
      </IconButton>
    </Coachmark>
  )
}
