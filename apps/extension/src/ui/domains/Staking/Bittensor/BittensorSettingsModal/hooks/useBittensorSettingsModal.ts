import { log } from "@common/log"
import { createGlobalOpenClose } from "@ui/hooks/createGlobalOpenClose"
import { useCallback } from "react"

import type { BittensorSettingsOpenOptions } from "./useBittensorSettingsWizard"
import { useResetBittensorSettingsWizard } from "./useBittensorSettingsWizard"

const [useBittensorSettingsOpenClose] = createGlobalOpenClose()

export const useBittensorSettingsModal = () => {
  const reset = useResetBittensorSettingsWizard()

  const { isOpen, open: innerOpen, close } = useBittensorSettingsOpenClose()

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
