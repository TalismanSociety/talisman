import throttle from "lodash/throttle"
import { useEffect } from "react"

import { api } from "@ui/api"

/**
 * Used to reset the wallet autolock timer whenever the user interacts with the UI.
 **/
export const useKeepWalletUnlocked = () => {
  useEffect(() => {
    // throttle this call so we only call it a maximum of once per 10 seconds
    const keepunlocked = throttle(() => api.keepunlocked(), 10_000, {
      leading: true,
      trailing: true,
    })

    // attach event listeners to keep the wallet unlocked
    window.addEventListener("mousedown", keepunlocked)
    window.addEventListener("mouseup", keepunlocked)
    window.addEventListener("keydown", keepunlocked)
    window.addEventListener("keyup", keepunlocked)
    window.addEventListener("keypress", keepunlocked)
    window.addEventListener("touchstart", keepunlocked)
    window.addEventListener("touchend", keepunlocked)

    return () => {
      // remove event listeners
      window.removeEventListener("mousedown", keepunlocked)
      window.removeEventListener("mouseup", keepunlocked)
      window.removeEventListener("keydown", keepunlocked)
      window.removeEventListener("keyup", keepunlocked)
      window.removeEventListener("keypress", keepunlocked)
      window.removeEventListener("touchstart", keepunlocked)
      window.removeEventListener("touchend", keepunlocked)
    }
  }, [])
}
