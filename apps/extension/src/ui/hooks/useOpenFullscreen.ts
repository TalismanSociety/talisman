import { api } from "@ui/api"
import { useCallback } from "react"
import { useLocation } from "react-router-dom"

export const useOpenFullscreen = () => {
  const { pathname, search } = useLocation()

  return useCallback(() => {
    // assume paths are the same in dashboard
    // portfolio pages supports account/folder query string arguments to stay in sync with popup
    api.dashboardOpen(`${pathname}${search}`)
    window.close()
  }, [pathname, search])
}
