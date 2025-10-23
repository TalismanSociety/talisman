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
    ({
      tokenId,
      productId,
      validatorAddress,
    }: {
      tokenId: TokenId
      productId?: string
      validatorAddress?: string
    }) => {
      // Set isAddToPositionFlow flag if productId is provided (indicating Add to Position flow)
      reset({ tokenId, productId, validatorAddress, isAddToPositionFlow: !!productId })

      if (IS_POPUP) {
        // Navigate to full page in popup mode
        const params = new URLSearchParams({ tokenId })
        if (productId) params.set("productId", productId)
        if (validatorAddress) params.set("validatorAddress", validatorAddress)
        navigate(`/select-product?${params.toString()}`)
      } else {
        // Open modal in dashboard mode
        innerOpen()
      }
    },
    [innerOpen, reset, navigate],
  )

  return { isOpen, open, close, tokenId }
}
