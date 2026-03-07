import type { Address } from "@core"
import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import type { TokenId } from "@talismn/chaindata-provider"
import { useCallback } from "react"

import { useResetNomPoolBondWizard } from "./useBondWizard"

export const useBondModal = () => {
  const reset = useResetNomPoolBondWizard()

  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("NomPoolBondModal")

  const open = useCallback(
    ({
      address,
      tokenId,
      poolId,
    }: {
      address: Address
      tokenId: TokenId
      poolId: number | string
    }) => {
      reset({
        address,
        tokenId,
        poolId,
        step: "form",
      })

      // then open the modal
      innerOpen()
    },
    [innerOpen, reset]
  )

  return { isOpen, open, close }
}
