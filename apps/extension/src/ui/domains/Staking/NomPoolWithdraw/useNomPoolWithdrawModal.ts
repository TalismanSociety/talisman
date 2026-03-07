import type { Address } from "@core/types/base"
import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import type { TokenId } from "@talismn/chaindata-provider"
import { useCallback } from "react"

import { useResetNomPoolWithdrawWizard } from "./useNomPoolWithdrawWizard"

export const useNomPoolWithdrawModal = () => {
  const reset = useResetNomPoolWithdrawWizard()

  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("NomPoolWithdrawModal")

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
