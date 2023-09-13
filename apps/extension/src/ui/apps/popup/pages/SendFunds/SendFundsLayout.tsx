import { ChevronLeftIcon } from "@talismn/icons"
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

  const showBackButton = withBackLink && window.history.length > 1

  return (
    <div id="main" className="relative flex h-full w-full flex-col">
      <div className="text-body-secondary flex h-32 min-h-[6.4rem] w-full items-center px-12">
        {showBackButton ? (
          <button
            type="button"
            className="text-body-secondary flex cursor-pointer items-center text-lg hover:text-white"
            onClick={handleBackClick}
          >
            <ChevronLeftIcon />
          </button>
        ) : (
          <div className="w-12">&nbsp;</div>
        )}
        <div className="grow text-center">{title}</div>
        <div className="w-12">&nbsp;</div>
      </div>
      <div className="w-full grow overflow-hidden">{children}</div>
    </div>
  )
}
