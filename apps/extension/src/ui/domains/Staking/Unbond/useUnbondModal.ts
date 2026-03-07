import type { Address } from "@core/types/base"
import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import type { TokenId } from "@talismn/chaindata-provider"
import { useCallback } from "react"

import { useResetNomPoolUnbondWizard } from "./useUnbondWizard"

export const useUnbondModal = () => {
  const reset = useResetNomPoolUnbondWizard()

  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("UnstakeModal")

  const open = useCallback(
    ({
      address,
      tokenId,
      poolId,
    }: {
      address: Address
      tokenId: TokenId
      poolId: string | number | undefined
    }) => {
      reset({ address, tokenId, poolId })

      // then open the modal
      innerOpen()
    },
    [innerOpen, reset]
  )

  return { isOpen, open, close }
}
