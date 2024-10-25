import { ChevronRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { MouseEventHandler, useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { getWhatsNewVersions } from "@ui/apps/popup/pages/WhatsNew/WhatsNew"
import { useSetting } from "@ui/state"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Portfolio",
  featureVersion: 2,
  page: "Portfolio Home",
}

type Props = {
  className?: string
}

export const NewFeaturesButton = ({ className }: Props) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [dismissedVersion, setDismissedVersion] = useSetting("newFeaturesDismissed")
  const versions = getWhatsNewVersions()

  const handleClick = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "What's New" })
    return navigate("/whats-new")
  }, [navigate])

  const handleDismissClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      event.preventDefault()
      event.stopPropagation()

      sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Interact", action: "Dismiss What's New" })
      setDismissedVersion(versions[0])
    },
    [setDismissedVersion, versions],
  )

  if (dismissedVersion === versions[0]) return null

  return (
    <div
      tabIndex={0}
      role="button"
      className={classNames(
        "text-body-secondary bg-grey-500 relative flex w-full cursor-pointer items-center gap-6 overflow-hidden rounded-sm px-6 py-8 hover:bg-[rgb(120,120,120)] hover:text-white",
        className,
      )}
      onClick={handleClick}
      onKeyDown={(e) => ["Enter", " "].includes(e.key) && handleClick?.()}
    >
      <div
        className="absolute left-0 z-0 h-full w-full opacity-40"
        style={{
          // A nice LAB colourspace gradient from #ff0073 to #7774d8.
          // Check out this blog post if you want to learn about why this looks nice:
          // https://www.joshwcomeau.com/css/make-beautiful-gradients
          backgroundImage: `linear-gradient(
            285deg,
            hsl(333deg 100% 50%) 0%,
            hsl(335deg 91% 56%) 21%,
            hsl(333deg 80% 57%) 30%,
            hsl(329deg 69% 57%) 39%,
            hsl(323deg 58% 57%) 46%,
            hsl(314deg 47% 56%) 54%,
            hsl(299deg 37% 55%) 61%,
            hsl(280deg 42% 58%) 69%,
            hsl(261deg 48% 62%) 79%,
            hsl(242deg 56% 65%) 100%
        )`,
        }}
      />
      <div className="relative flex grow flex-col items-start justify-center gap-3 overflow-hidden">
        <div className="text-body text-sm font-bold">
          <Trans t={t}>
            Your Wallet Just <span className="text-primary">Got Better</span>
          </Trans>
        </div>
        <div className="text-tiny text-grey-200 flex gap-3">
          <span>{t("See what's new in Talisman")}</span>
          <button className="underline" onClick={handleDismissClick} type="button">
            {t("Dismiss")}
          </button>
        </div>
      </div>
      <div className="relative text-lg">
        <ChevronRightIcon />
      </div>
    </div>
  )
}
