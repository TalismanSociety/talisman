import { TokenId } from "@talismn/chaindata-provider"
import { Address } from "extension-core"
import { useCallback } from "react"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"

import { useResetNomPoolBondWizard } from "./useNomPoolBondWizard"

export const useNomPoolBondModal = () => {
  const reset = useResetNomPoolBondWizard()

  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("NomPoolBondModal")

  const open = useCallback(
    ({ address, tokenId, poolId }: { address: Address; tokenId: TokenId; poolId: number }) => {
      reset({ address, tokenId, poolId })

      // then open the modal
      innerOpen()
    },
    [innerOpen, reset],
  )

  return { isOpen, open, close }
}
