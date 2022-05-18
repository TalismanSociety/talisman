import { useCallback, useEffect, useMemo, useState } from "react"
import { SendTokensInputs } from "./types"
import { provideContext } from "@talisman/util/provideContext"
import { useLocation } from "react-router-dom"

const useSendTokensModalProvider = () => {
  const [config, setConfig] = useState<Partial<SendTokensInputs>>()
  const location = useLocation()

  const open = useCallback((config: Partial<SendTokensInputs> = {}) => {
    setConfig(config)
  }, [])

  const close = useCallback(() => {
    setConfig(undefined)
  }, [])

  useEffect(() => {
    setConfig(undefined)
  }, [location])

  const isOpen = useMemo(() => Boolean(config), [config])

  return {
    isOpen,
    config,
    open,
    close,
  }
}

export const [SendTokensModalProvider, useSendTokensModal] = provideContext(
  useSendTokensModalProvider
)
