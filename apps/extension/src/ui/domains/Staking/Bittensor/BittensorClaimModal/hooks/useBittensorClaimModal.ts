import { log } from "@common/log"
import { useGlobalOpenClose } from "@ui/hooks/useGlobalOpenClose"
import { useCallback } from "react"

import type { BittensorClaimOpenOptions } from "./useBittensorClaimWizard"
import { useResetBittensorClaimWizard } from "./useBittensorClaimWizard"

export const useBittensorClaimModal = () => {
  const reset = useResetBittensorClaimWizard()

  const { isOpen, open: innerOpen, close } = useGlobalOpenClose("BittensorClaimModal")

  const open = useCallback(
    (opts: BittensorClaimOpenOptions) => {
      log.debug("[tao] Resetting Bittensor Claim Wizard", opts)
      reset(opts)
      innerOpen()
    },
    [innerOpen, reset]
  )

  return { isOpen, open, close }
}
