import throttle from "lodash/throttle"
import { useEffect } from "react"

import { api } from "@ui/api"

/** Sets whether the wallet autolock timer should be restarted on a user-interaction, or on a 10s interval. */
export type KeepWalletUnlockedMode = "user-interaction" | "always"

/**
 * Used to reset the wallet autolock timer whenever the user interacts with the UI.
 **/
export const useKeepWalletUnlocked = ({
  mode = "user-interaction",
}: {
  /**
   * When `user-interaction`, the wallet will remain unlocked as long as the user interacts with the UI.
   * When `always`, the wallet will remain unlocked as long as the hook is mounted.
   */
  mode?: KeepWalletUnlockedMode
} = {}) => {
  useEffect(() => {
    // throttle this call so we only call it a maximum of once per 10 seconds
    const keepunlocked = throttle(() => api.keepunlocked(), 10_000, {
      leading: true,
      trailing: true,
    })

    if (mode === "always") {
      const interval = setInterval(keepunlocked, 10_000)
      return () => clearInterval(interval)
    }

    // attach event listeners to keep the wallet unlocked
    window.addEventListener("mousedown", keepunlocked)
    window.addEventListener("mouseup", keepunlocked)
    window.addEventListener("mousemove", keepunlocked)
    window.addEventListener("keydown", keepunlocked)
    window.addEventListener("keyup", keepunlocked)
    window.addEventListener("keypress", keepunlocked)
    window.addEventListener("touchstart", keepunlocked)
    window.addEventListener("touchend", keepunlocked)
    window.addEventListener("touchmove", keepunlocked)

    return () => {
      // remove event listeners
      window.removeEventListener("mousedown", keepunlocked)
      window.removeEventListener("mouseup", keepunlocked)
      window.removeEventListener("mousemove", keepunlocked)
      window.removeEventListener("keydown", keepunlocked)
      window.removeEventListener("keyup", keepunlocked)
      window.removeEventListener("keypress", keepunlocked)
      window.removeEventListener("touchstart", keepunlocked)
      window.removeEventListener("touchend", keepunlocked)
      window.removeEventListener("touchmove", keepunlocked)
    }
  }, [mode])
}
