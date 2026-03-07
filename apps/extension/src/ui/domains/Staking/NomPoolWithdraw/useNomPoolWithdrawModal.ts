import type { Address } from "@core/types/base"
import type { TokenId } from "@talismn/chaindata-provider"
import { useGlobalOpenClose } from "@ui/hooks/useGlobalOpenClose"
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
