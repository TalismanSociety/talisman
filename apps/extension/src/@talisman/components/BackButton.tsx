import { ChevronLeftIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { ButtonHTMLAttributes, DetailedHTMLProps, FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { To, useNavigate } from "react-router-dom"

type BackButtonProps = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  to?: string
  analytics?: AnalyticsPage
}

export const BackButton: FC<BackButtonProps> = ({ analytics, children, to, ...props }) => {
  const navigate = useNavigate()

  const handleBackClick = useCallback(() => {
    if (analytics) {
      sendAnalyticsEvent({
        ...analytics,
        name: "Goto",
        action: "Back",
      })
    }
    navigate(to ?? (-1 as To))
  }, [analytics, navigate, to])

  const { t } = useTranslation()

  return (
    <button
      type="button"
      {...props}
      onClick={handleBackClick}
      className={classNames(
        "allow-focus bg-grey-850 hover:bg-grey-800 text-grey-400 hover:text-grey-300 inline-flex items-center gap-2 rounded-sm py-3 pl-2 pr-4 text-sm",
        props.className
      )}
    >
      <ChevronLeftIcon />
      <span>{children ?? t("Back")}</span>
    </button>
  )
}
