import { IconButton } from "@talisman/components/IconButton"
import { ChevronLeftIcon } from "@talisman/theme/icons"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { FC, ReactNode, useCallback } from "react"
import { useNavigate } from "react-router-dom"

type SendFundsLayoutProps = {
  title?: ReactNode
  withBackLink?: boolean
  children?: ReactNode
  analytics: AnalyticsPage
}

export const SendFundsLayout: FC<SendFundsLayoutProps> = ({
  title,
  children,
  withBackLink,
  analytics,
}) => {
  const navigate = useNavigate()

  useAnalyticsPageView(analytics)

  const handleBackClick = useCallback(() => {
    sendAnalyticsEvent({
      ...analytics,
      name: "Goto",
      action: "Back",
    })
    navigate(-1)
  }, [analytics, navigate])

  return (
    <div id="main" className="relative flex h-full w-full flex-col">
      <div className="flex h-32 min-h-[6.4rem] w-full items-center px-12">
        <div className="w-12">
          {withBackLink && window.history.length > 1 && (
            <IconButton className="text-lg" onClick={handleBackClick}>
              <ChevronLeftIcon />
            </IconButton>
          )}
        </div>
        <div className="text-body-secondary grow text-center">{title}</div>
        <div className="w-12"></div>
      </div>
      <div className="w-full grow overflow-hidden">{children}</div>
    </div>
  )
}
