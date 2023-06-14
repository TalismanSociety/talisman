import { useOpenCloseGlobal } from "@talisman/hooks/useOpenClose"

export const useBuyTokensModal = () => {
  return useOpenCloseGlobal("BUY_TOKENS_MODAL")
}
