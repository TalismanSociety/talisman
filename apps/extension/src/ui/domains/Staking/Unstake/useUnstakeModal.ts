import { TokenId } from "@talismn/chaindata-provider"
import { Address } from "extension-core"
import { useCallback } from "react"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"

import { useResetUnstakeWizard } from "./useUnstakeWizard"

export const useUnstakeModal = () => {
  const reset = useResetUnstakeWizard()

  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("UnstakeModal")

  const open = useCallback(
    ({ address, tokenId }: { address: Address; tokenId: TokenId }) => {
      reset({ address, tokenId })

      // then open the modal
      innerOpen()
    },
    [innerOpen, reset]
  )

  return { isOpen, open, close }
}
