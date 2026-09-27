import type { Address } from "@core/types/base"
import type { TokenId } from "@talismn/chaindata-provider"
import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"
import { useCallback } from "react"

import { useResetNomPoolUnbondWizard } from "./useUnbondWizard"

const [useUnbondOpenClose] = createGlobalOpenClose()

export const useUnbondModal = () => {
  const reset = useResetNomPoolUnbondWizard()

  const { isOpen, open: innerOpen, close } = useUnbondOpenClose()

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
