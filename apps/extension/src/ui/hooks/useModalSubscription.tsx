import { api } from "@ui/api"
import { useBuyTokensModal } from "@ui/domains/Asset/Buy/useBuyTokensModal"
import { useEffect } from "react"
import Browser from "webextension-polyfill"

const focusCurrentTab = async () => {
  // ensure tab is active
  const tab = await Browser.tabs.getCurrent()
  if (!tab.active) await Browser.tabs.update(tab.id, { active: true })

  // ensure window is focused
  const win = await Browser.windows.getCurrent()
  if (!win.focused && typeof win.id === "number")
    await Browser.windows.update(win.id, { focused: true })
}

/**
 * Use the useModalSubscription hook to subscribe to modal messages sent across extension environments (popup -> dashboard)
 */
export const useModalSubscription = () => {
  const { open: openBuyTokensModal } = useBuyTokensModal()

  useEffect(() => {
    const unsubscribe = api.modalOpenSubscribe(async (request) => {
      switch (request.modalType) {
        case "buy":
          await focusCurrentTab()
          openBuyTokensModal()
          break
        default:
          break
      }
    })

    return () => unsubscribe()
  }, [openBuyTokensModal])
}
