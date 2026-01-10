import { log } from "extension-shared"
import { useCallback } from "react"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"

import type { ChangeValidatorOpenOptions } from "./useBittensorChangeValidatorWizard"
import { useResetBittensorChangeValidatorWizard } from "./useBittensorChangeValidatorWizard"

export const useBittensorChangeValidatorModal = () => {
  const reset = useResetBittensorChangeValidatorWizard()

  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("BittensorChangeValidatorModal")

  const open = useCallback(
    (opts: ChangeValidatorOpenOptions) => {
      log.debug("[tao] Resetting Bittensor Change Validator Wizard", opts)
      reset(opts)
      innerOpen()
    },
    [innerOpen, reset],
  )

  return { isOpen, open, close }
}
