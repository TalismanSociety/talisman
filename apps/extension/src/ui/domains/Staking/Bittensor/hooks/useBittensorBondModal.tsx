import { TokenId } from "@talismn/chaindata-provider"
import { Address } from "extension-core"
import { useCallback } from "react"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"

import type { StakeDirection, StakeType, WizardStep } from "./useBittensorBondWizard"
import { useResetBittensorBondWizard } from "./useBittensorBondWizard"

export const useBittensorBondModal = () => {
  const reset = useResetBittensorBondWizard()

  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("BittensorBondModal")

  const open = useCallback(
    ({
      address,
      tokenId,
      hotkey,
      stakeType,
      stakeDirection = "bond",
      netuid,
    }: {
      address?: Address
      tokenId: TokenId
      hotkey?: string
      stakeType?: StakeType
      stakeDirection?: StakeDirection
      step?: WizardStep
      netuid?: number
    }) => {
      reset({
        address,
        tokenId,
        hotkey,
        stakeType,
        stakeDirection,
        netuid,
      })

      innerOpen()
    },
    [innerOpen, reset],
  )

  return { isOpen, open, close }
}
