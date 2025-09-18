import { TokenId } from "@talismn/chaindata-provider"
import { useCallback } from "react"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"

import { useEarnWizard, useResetEarnWizard } from "./useEarnWizard"

export const useEarnModal = () => {
  const reset = useResetEarnWizard()
  const { tokenId } = useEarnWizard()
  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("EarnModal")

  const open = useCallback(
    ({ tokenId }: { tokenId: TokenId }) => {
      reset({ tokenId })
      innerOpen()
    },
    [innerOpen, reset],
  )

  return { isOpen, open, close, tokenId }
}
