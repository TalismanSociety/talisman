import { TokenId } from "@talismn/chaindata-provider"
import { Address } from "extension-core"
import { log } from "extension-shared"
import { useCallback } from "react"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"

import type { StakeDirection } from "./useBittensorBondWizard"
import { useResetBittensorBondWizard } from "./useBittensorBondWizard"

export const useBittensorBondModal = () => {
  const reset = useResetBittensorBondWizard()

  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("BittensorBondModal")

  const open = useCallback(
    ({
      stakeDirection,
      address,
      tokenId,
      hotkey,
      netuid,
    }: {
      stakeDirection: StakeDirection
      address?: Address
      tokenId: TokenId
      hotkey?: string
      netuid?: number
    }) => {
      log.debug("[tao] Resetting Bittensor Bond Wizard", {
        address,
        tokenId,
        hotkey,
        stakeDirection,
        netuid,
      })
      reset({
        address,
        tokenId,
        hotkey,
        stakeDirection,
        netuid,
      })

      innerOpen()
    },
    [innerOpen, reset],
  )

  return { isOpen, open, close }
}
