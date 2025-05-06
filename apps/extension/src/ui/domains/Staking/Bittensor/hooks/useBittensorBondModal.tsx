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
      poolId,
      isSelectStakeDrawerOpen = false,
      stakeType = "root",
      stakeDirection = "bond",
      step = "form",
      netuid = null,
    }: {
      address: Address
      tokenId: TokenId
      poolId: number | string
      isSelectStakeDrawerOpen?: boolean
      stakeType?: StakeType
      stakeDirection?: StakeDirection
      step?: WizardStep
      netuid: number | null | undefined
    }) => {
      reset({
        address,
        tokenId,
        poolId,
        step,
        stakeType,
        stakeDirection,
        isSelectStakeDrawerOpen,
        netuid,
      })

      innerOpen()
    },
    [innerOpen, reset],
  )

  return { isOpen, open, close }
}
