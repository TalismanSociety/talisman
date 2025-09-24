import { TokenId } from "@talismn/chaindata-provider"
import { useCallback } from "react"
import { useNavigate } from "react-router-dom"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { IS_POPUP } from "@ui/util/constants"

import { useEarnWizard, useResetEarnWizard } from "./useEarnWizard"

export const useEarnModal = () => {
  const reset = useResetEarnWizard()
  const { tokenId } = useEarnWizard()
  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("EarnModal")
  const navigate = useNavigate()

  const open = useCallback(
    ({ tokenId }: { tokenId: TokenId }) => {
      reset({ tokenId })

      if (IS_POPUP) {
        // Navigate to full page in popup mode
        navigate(`/earn?tokenId=${encodeURIComponent(tokenId)}`)
      } else {
        // Open modal in dashboard mode
        innerOpen()
      }
    },
    [innerOpen, reset, navigate],
  )

  return { isOpen, open, close, tokenId }
}
