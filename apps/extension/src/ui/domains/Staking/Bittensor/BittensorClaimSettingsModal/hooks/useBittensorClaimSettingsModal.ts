import { log } from "@common/log"
import { useGlobalOpenClose } from "@ui/hooks/useGlobalOpenClose"
import { useCallback } from "react"

import type { BittensorClaimSettingsOpenOptions } from "./useBittensorClaimSettingsWizard"
import { useResetBittensorClaimSettingsWizard } from "./useBittensorClaimSettingsWizard"

export const useBittensorClaimSettingsModal = () => {
  const reset = useResetBittensorClaimSettingsWizard()

  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("BittensorClaimSettingsModal")

  const open = useCallback(
    (opts: BittensorClaimSettingsOpenOptions) => {
      log.debug("[tao] Resetting Bittensor Claim Settings Wizard", opts)
      reset(opts)
      innerOpen()
    },
    [innerOpen, reset]
  )

  return { isOpen, open, close }
}
