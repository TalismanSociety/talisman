import { IS_FIREFOX } from "extension-shared"
import { useEffect } from "react"

import { api } from "@ui/api"

/**
 * Used to keep the background page open on Firefox
 * @returns void
 **/
export const useKeepBackgroundOpen = () => {
  useEffect(() => {
    if (!IS_FIREFOX) return
    const interval = setInterval(() => {
      // making any runtime call keeps the background page open
      api.ping()
    }, 10000)
    return () => clearInterval(interval)
  }, [])
}
