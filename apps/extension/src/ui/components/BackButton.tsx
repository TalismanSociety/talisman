import { ChevronLeftIcon } from "@talismn/icons"
import { type AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { cn } from "@ui/util/cn"
import { type ButtonHTMLAttributes, type DetailedHTMLProps, type FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { type To, useNavigate } from "react-router-dom"

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
      className={cn(
        "allow-focus inline-flex items-center gap-2 rounded-sm bg-grey-850 py-3 pr-4 pl-2 text-grey-400 text-sm hover:bg-grey-800 hover:text-grey-300",
        props.className
      )}
    >
      <ChevronLeftIcon />
      <span>{children ?? t("Back")}</span>
    </button>
  )
}
