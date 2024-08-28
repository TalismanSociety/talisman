import { TokenId } from "@talismn/chaindata-provider"
import { Address } from "extension-core"
import { useCallback } from "react"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"

import { useResetInlineStakingWizard } from "./useInlineStakingWizard"

export const useInlineStakingModal = () => {
  const reset = useResetInlineStakingWizard()

  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("inlineStakingModal")

  const open = useCallback(
    ({ address, tokenId, poolId }: { address: Address; tokenId: TokenId; poolId: number }) => {
      reset({ address, tokenId, poolId })

      // then open the modal
      innerOpen()
    },
    [innerOpen, reset]
  )

  return { isOpen, open, close }
}
