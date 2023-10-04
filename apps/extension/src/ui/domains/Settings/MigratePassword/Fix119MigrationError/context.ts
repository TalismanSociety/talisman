import useStatus from "@talisman/hooks/useStatus"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useCallback, useState } from "react"

import { useDismissFixBrokenMigrationModal } from "./useFixBrokenMigrationModal"

const useFix119MigrationErrorProvider = ({ onComplete }: { onComplete: () => void }) => {
  const [error, setError] = useState<Error>()
  const { setStatus, status, message } = useStatus()

  const attemptRecovery = useCallback(
    async (password: string) => {
      if (!password) return
      setStatus.processing()

      try {
        await api.recoverMnemonic(password)
        setStatus.success()
      } catch (err) {
        setError(err as Error)
        setStatus.error((err as Error).message)
      }
    },
    [setStatus]
  )

  const dismiss = useDismissFixBrokenMigrationModal()

  const closeAndComplete = useCallback(() => {
    dismiss()
    onComplete()
  }, [dismiss, onComplete])

  return {
    attemptRecovery,
    status,
    statusMessage: message,
    error,
    onComplete: closeAndComplete,
  }
}

const [Fix119MigrationErrorProvider, useFix119MigrationError] = provideContext(
  useFix119MigrationErrorProvider
)

export { Fix119MigrationErrorProvider, useFix119MigrationError }
