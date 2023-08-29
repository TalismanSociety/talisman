import { useCallback, useEffect, useState } from "react"
import Browser from "webextension-polyfill"

// use this hook to prevent popup from beeing hidden by D'CENT bridge when signing from popup
export const useBringPopupBackInFront = () => {
  const [isListening, setIsListening] = useState(false)

  useEffect(() => {
    if (!isListening) return () => {}

    const handleTabCreated = async () => {
      const { id } = await Browser.windows.getCurrent()
      if (id) Browser.windows.update(id, { focused: true })
      setIsListening(false)
    }

    Browser.tabs.onCreated.addListener(handleTabCreated)
    return () => Browser.tabs.onCreated.removeListener(handleTabCreated)
  }, [isListening])

  const startListening = useCallback(() => setIsListening(true), [])

  const stopListening = useCallback(() => setIsListening(false), [])

  return { startListening, stopListening }
}
