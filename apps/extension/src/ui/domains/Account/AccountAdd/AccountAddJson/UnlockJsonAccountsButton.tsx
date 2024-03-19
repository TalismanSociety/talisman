import { log } from "@extension/shared"
import { yupResolver } from "@hookform/resolvers/yup"
import { CapsLockWarningIcon } from "@talisman/components/CapsLockWarningIcon"
import { KeyIcon } from "@talismn/icons"
import { CSSProperties, FC, useCallback, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { ModalDialog } from "talisman-ui"
import { Button, FormFieldContainer, FormFieldInputText, Modal, useOpenClose } from "talisman-ui"
import * as yup from "yup"

import { useJsonAccountImport } from "./context"

type FormData = {
  password?: string
}

export const UnlockJsonAccountsButton: FC = () => {
  const { t } = useTranslation("admin")
  const { open, isOpen, close } = useOpenClose()

  const {
    accounts = [],
    requiresAccountUnlock,
    unlockAttemptProgress,
    unlockAccounts,
    isMultiAccounts,
  } = useJsonAccountImport()

  const schema = yup
    .object({
      password: yup.string().required(""), // matches the medium strengh requirement
    })
    .required()

  const {
    register,
    handleSubmit,
    reset,
    resetField,
    setFocus,
    setError,
    setValue,
    clearErrors,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "all",
    reValidateMode: "onChange",
    resolver: yupResolver(schema),
  })

  useEffect(() => {
    if (isOpen) reset()
  }, [reset, isOpen])

  const submit = useCallback(
    async (fields: FormData) => {
      try {
        clearErrors()
        if (!fields.password) return
        await unlockAccounts(fields.password)
        resetField("password")
      } catch (err) {
        log.error("failed to unlock", { err })
        setError("password", { message: t("Incorrect password") }, { shouldFocus: true })
      }
    },
    [clearErrors, resetField, setError, t, unlockAccounts]
  )

  const { unlockedCount, selectedCount, progressStyle, unlockAttemptProgressStyle } =
    useMemo(() => {
      const selected = accounts.filter((a) => a.selected)
      const selectedCount = selected.length
      const unlockedCount = selected.filter((a) => !a.isLocked).length
      const unlockProgressStyle: CSSProperties = selectedCount
        ? { transform: `translateX(-${100 - Math.round((unlockedCount / selectedCount) * 100)}%)` }
        : {}
      const unlockAttemptProgressStyle: CSSProperties = selectedCount
        ? {
            transform: `translateX(-${
              100 - Math.round((unlockAttemptProgress / selectedCount) * 100)
            }%)`,
          }
        : {}
      return {
        unlockedCount,
        selectedCount,
        progressStyle: unlockProgressStyle,
        unlockAttemptProgressStyle,
      }
    }, [accounts, unlockAttemptProgress])

  // close modal when all accounts are unlocked
  useEffect(() => {
    if (unlockedCount === selectedCount) close()
  })

  // manual autoFocus to prevent modal flickering on open
  useEffect(() => {
    if (isOpen) setTimeout(() => setFocus("password"), 50)
  }, [isOpen, setFocus])

  useEffect(() => {
    return () => {
      setValue("password", "")
    }
  }, [setValue])

  if (!isMultiAccounts) return null

  return (
    <>
      <Button type="button" onClick={open} disabled={!requiresAccountUnlock}>
        {t("Unlock")}
      </Button>
      <Modal isOpen={isOpen} onDismiss={close}>
        <ModalDialog title={t("Unlock accounts")} onClose={close}>
          <div className="text-body-secondary w-full text-right">
            <Trans
              t={t}
              defaults="<Unlocked>{{unlockedCount}}</Unlocked>/<Selected>{{selectedCount}}</Selected> unlocked"
              values={{ unlockedCount, selectedCount }}
              components={{
                Unlocked: <span className="text-primary"></span>,
                Selected: <span></span>,
              }}
            />
          </div>
          <div className="bg-grey-800 relative my-4 flex h-5 overflow-hidden rounded-lg">
            <div
              className="bg-grey-700 absolute left-0 top-0 h-5 w-full rounded-lg transition-transform ease-out"
              style={unlockAttemptProgressStyle}
            ></div>
            <div
              className="bg-primary-500 absolute left-0 top-0 h-5 w-full rounded-lg transition-transform duration-300 ease-out"
              style={progressStyle}
            ></div>
          </div>
          <div className="text-body-secondary my-16">
            {t(
              "Enter the passwords for each of the selected accounts, until all accounts unlocked."
            )}
          </div>
          <form onSubmit={handleSubmit(submit)} autoComplete="off">
            <FormFieldContainer error={errors.password?.message}>
              <FormFieldInputText
                before={<KeyIcon className="opacity-50" />}
                {...register("password")}
                type="password"
                placeholder={t("Enter password")}
                spellCheck={false}
                data-lpignore
                readOnly={isSubmitting}
                after={<CapsLockWarningIcon />}
              />
            </FormFieldContainer>
            <div className="mt-8">
              <Button type="submit" fullWidth primary disabled={!isValid} processing={isSubmitting}>
                {t("Unlock")}
              </Button>
            </div>
          </form>
        </ModalDialog>
      </Modal>
    </>
  )
}
