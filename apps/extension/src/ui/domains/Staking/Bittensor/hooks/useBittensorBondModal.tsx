import { log } from "@common/log"
import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"
import { useCallback } from "react"

import type { BittensorStakingWizardOpenOptions } from "./useBittensorBondWizard"
import { useResetBittensorBondWizard } from "./useBittensorBondWizard"

const [useBittensorBondOpenClose] = createGlobalOpenClose()

export const useBittensorBondModal = () => {
  const reset = useResetBittensorBondWizard()

  const { isOpen, open: innerOpen, close } = useBittensorBondOpenClose()

  const open = useCallback(
    (opts: BittensorStakingWizardOpenOptions) => {
      log.debug("[tao] Resetting Bittensor Bond Wizard", opts)
      reset(opts)
      innerOpen()
    },
    [innerOpen, reset]
  )

  return { isOpen, open, close }
}
