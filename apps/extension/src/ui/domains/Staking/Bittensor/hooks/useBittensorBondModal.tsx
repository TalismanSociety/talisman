import { log } from "extension-shared"
import { useCallback } from "react"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"

import type { BittensorStakingWizardOpenOptions } from "./useBittensorBondWizard"
import { useResetBittensorBondWizard } from "./useBittensorBondWizard"

export const useBittensorBondModal = () => {
  const reset = useResetBittensorBondWizard()

  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("BittensorBondModal")

  const open = useCallback(
    (opts: BittensorStakingWizardOpenOptions) => {
      log.debug("[tao] Resetting Bittensor Bond Wizard", opts)
      reset(opts)
      innerOpen()
    },
    [innerOpen, reset],
  )

  return { isOpen, open, close }
}
