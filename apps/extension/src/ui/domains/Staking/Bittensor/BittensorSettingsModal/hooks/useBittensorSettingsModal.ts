import { log } from "@common/log"
import { useGlobalOpenClose } from "@ui/hooks/useGlobalOpenClose"
import { useCallback } from "react"

import type { BittensorSettingsOpenOptions } from "./useBittensorSettingsWizard"
import { useResetBittensorSettingsWizard } from "./useBittensorSettingsWizard"

export const useBittensorSettingsModal = () => {
  const reset = useResetBittensorSettingsWizard()

  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("BittensorSettingsModal")

  const open = useCallback(
    (opts: BittensorSettingsOpenOptions) => {
      log.debug("[tao] Resetting Bittensor Settings Wizard", opts)
      reset(opts)
      innerOpen()
    },
    [innerOpen, reset]
  )

  return { isOpen, open, close }
}
