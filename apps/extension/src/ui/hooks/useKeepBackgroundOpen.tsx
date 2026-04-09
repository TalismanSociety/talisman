import { api } from "@ui/api"
import { useEffect } from "react"

/**
 * Used to keep the background page open on Firefox
 **/
export const useKeepBackgroundOpen = () => {
  useEffect(() => {
    const interval = setInterval(() => {
      // making any runtime call keeps the background page open
      api.keepalive()
    }, 10_000)

    return () => clearInterval(interval)
  }, [])
}
