import { log } from "extension-shared"
import { useCallback } from "react"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"

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
    [innerOpen, reset],
  )

  return { isOpen, open, close }
}
