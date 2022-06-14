import { useEffect } from "react"
import { useAnalytics } from "./useAnalytics"

export const useAnalyticsPopupOpen = (pageName: string) => {
  const { popupOpenEvent } = useAnalytics()

  useEffect(() => {
    popupOpenEvent(pageName)
  }, [popupOpenEvent, pageName])
}
