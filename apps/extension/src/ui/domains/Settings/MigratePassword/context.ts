import { passwordStore } from "@core/domains/app/store.password"
import { getErrorMessage } from "@talismn/util"
import { api } from "@ui/api"
import { reportError } from "@ui/api/errorReporting"
import { type FlowStep, flows, useFlow } from "@ui/hooks/analytics/flows"
import { useMnemonicsAllBackedUp } from "@ui/hooks/useMnemonicsAllBackedUp"
import { useSensitiveState } from "@ui/hooks/useSensitiveState"
import useStatus, { type StatusOptions, statusOptions } from "@ui/hooks/useStatus"
import { useMnemonics } from "@ui/state/mnemonics"
import { useSetting } from "@ui/state/settings"
import { provideContext } from "@ui/util/provideContext"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { dismissMigratePasswordModal } from "./useMigratePasswordModal"

type MigrationStep = FlowStep<typeof flows.password_migration>

const migrationStep = ({
  status,
  hasPassword,
  allBackedUp,
  passwordTrimmed,
  hasNewPassword,
}: {
  status: StatusOptions
  hasPassword: boolean
  allBackedUp: boolean
  passwordTrimmed: boolean | undefined
  hasNewPassword: boolean
}): MigrationStep | null => {
  if (status === statusOptions.PROCESSING) return "processing"
  if (status === statusOptions.SUCCESS || status === statusOptions.ERROR) return null
  if (!hasPassword) return "password"
  if (!allBackedUp) return "backup"
  if (passwordTrimmed && !hasNewPassword) return "new_password"
  return null
}

const useMigratePasswordProvider = ({ onComplete }: { onComplete: () => void }) => {
  const [password, setPassword] = useSensitiveState<string>()
  const [newPassword, setNewPassword] = useSensitiveState<string>()
  const [mnemonic, setMnemonic] = useSensitiveState<string>()
  const [passwordTrimmed, setPasswordTrimmed] = useState<boolean>()
  const [error, setError] = useState<Error>()
  const { setStatus, status, message } = useStatus()
  const { t } = useTranslation()
  const allBackedUp = useMnemonicsAllBackedUp()
  const mnemonics = useMnemonics()

  // assume that if password has not been migrated yet, there is only one mnemonic
  const mnemonicId = useMemo(() => mnemonics[0]?.id, [mnemonics])

  useEffect(() => {
    if (!password) return
    passwordStore.get("isTrimmed").then((isTrimmed) => {
      setPasswordTrimmed(isTrimmed && password !== password.trim())
    })
  }, [password])

  // the error screen's checkbox turns error tracking on to send this report
  const [useErrorTracking] = useSetting("useErrorTracking")
  useEffect(() => {
    if (error && useErrorTracking) reportError(error)
  }, [error, useErrorTracking])

  const hasPassword = !!password
  const hasNewPassword = !!newPassword

  const setMnemonicBackupConfirmed = useCallback(async () => {
    mnemonicId && !allBackedUp && (await api.mnemonicConfirm(mnemonicId, true))
  }, [allBackedUp, mnemonicId])

  const migratePassword = useCallback(async () => {
    if ((passwordTrimmed && !newPassword) || !password || !allBackedUp) return
    setStatus.processing()
    flows.password_migration.submitted()
    // decide whether to use the new password or to use the same one
    let newPw = password
    if (passwordTrimmed && newPassword) {
      newPw = newPassword
    }
    try {
      const changed = await api.changePassword(password, newPw, newPw)
      if (changed) flows.password_migration.completed()
      else flows.password_migration.failed(new Error("Password migration was refused"))
      setStatus.success()
    } catch (err) {
      flows.password_migration.failed(err)
      setError(err as Error)
      setStatus.error(getErrorMessage(err, t("Unknown error")))
    }
  }, [allBackedUp, newPassword, password, passwordTrimmed, setStatus, t])

  useEffect(() => {
    if (status === statusOptions.INITIALIZED && allBackedUp) {
      migratePassword()
    }
  }, [allBackedUp, status, migratePassword])

  useFlow(flows.password_migration, {
    step: migrationStep({ status, hasPassword, allBackedUp, passwordTrimmed, hasNewPassword }),
  })

  const closeAndComplete = useCallback(() => {
    dismissMigratePasswordModal()
    onComplete()
  }, [onComplete])

  return {
    mnemonicId,
    hasPassword,
    hasNewPassword,
    setPassword,
    setNewPassword,
    passwordTrimmed,
    mnemonic,
    setMnemonic,
    migratePassword,
    status,
    statusMessage: message,
    error,
    hasBackedUpMnemonic: allBackedUp,
    setMnemonicBackupConfirmed,
    onComplete: closeAndComplete,
  }
}

const [MigratePasswordProvider, useMigratePassword] = provideContext(useMigratePasswordProvider)

export { MigratePasswordProvider, useMigratePassword }
