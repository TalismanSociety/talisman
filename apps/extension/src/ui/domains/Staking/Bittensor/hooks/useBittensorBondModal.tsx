import { TokenId } from "@talismn/chaindata-provider"
import { Address } from "extension-core"
import { useCallback } from "react"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"

import { useResetNomPoolBondWizard } from "./useBittensorBondWizard"

export const useBittensorBondModal = () => {
  const reset = useResetNomPoolBondWizard()

  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("BittensorBondModal")

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

      innerOpen()
    },
    [innerOpen, reset],
  )

  return { isOpen, open, close }
}
