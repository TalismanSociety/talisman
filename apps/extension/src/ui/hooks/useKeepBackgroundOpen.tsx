import { useEffect } from "react"

import { api } from "@ui/api"

/**
 * Used to keep the background page open on Firefox
 **/
export const useKeepBackgroundOpen = () => {
  useEffect(() => {
    const interval = setInterval(() => {
      // making any runtime call keeps the background page open
      // and resets the autolock timer
      api.keepalive()
    }, 10_000)

    return () => clearInterval(interval)
  }, [])
}
