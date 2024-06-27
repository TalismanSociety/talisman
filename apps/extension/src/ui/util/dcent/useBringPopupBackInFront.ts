import { useCallback, useEffect, useState } from "react"

// use this hook to prevent popup from beeing hidden by D'CENT bridge when signing from popup
export const useBringPopupBackInFront = () => {
  const [isListening, setIsListening] = useState(false)

  useEffect(() => {
    if (!isListening) return () => {}

    const handleTabCreated = async () => {
      const { id } = await chrome.windows.getCurrent()
      if (id) chrome.windows.update(id, { focused: true })
      setIsListening(false)
    }

    chrome.tabs.onCreated.addListener(handleTabCreated)
    return () => chrome.tabs.onCreated.removeListener(handleTabCreated)
  }, [isListening])

  const startListening = useCallback(() => setIsListening(true), [])

  const stopListening = useCallback(() => setIsListening(false), [])

  return { startListening, stopListening }
}
