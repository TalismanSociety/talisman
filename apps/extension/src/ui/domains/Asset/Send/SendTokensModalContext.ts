import { useCallback, useEffect, useMemo } from "react"
import { useLocation } from "react-router-dom"
import { atom, useRecoilState } from "recoil"

import { SendTokensInputs } from "./types"

const sendTokensModalState = atom<Partial<SendTokensInputs> | null>({
  key: "sendTokensModalState",
  default: null,
})

export const useSendTokensModal = () => {
  const [config, setConfig] = useRecoilState(sendTokensModalState)
  const location = useLocation()

  const open = useCallback(
    (config: Partial<SendTokensInputs> = {}) => {
      setConfig(config)
    },
    [setConfig]
  )

  const close = useCallback(() => {
    setConfig(null)
  }, [setConfig])

  useEffect(() => {
    setConfig(null)
  }, [location, setConfig])

  const isOpen = useMemo(() => Boolean(config), [config])

  return {
    isOpen,
    config,
    open,
    close,
  }
}
