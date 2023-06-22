import { log } from "@core/log"
import { yupResolver } from "@hookform/resolvers/yup"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { KeyIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { FC, useCallback, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { CSSProperties } from "styled-components"
import { Button, FormFieldContainer, FormFieldInputText, Modal, useOpenClose } from "talisman-ui"
import * as yup from "yup"

import { JsonImportAccount } from "./JsonAccountsList"

type FormData = {
  password?: string
}

export const UnlockJsonAccountsButton: FC<{
  accounts: JsonImportAccount[]
  requiresAccountUnlock: boolean
  unlockAttemptProgress: number
  unlockAccounts: (password: string) => void
}> = ({ accounts, requiresAccountUnlock, unlockAttemptProgress, unlockAccounts }) => {
  const { t } = useTranslation("account-add")
  const { open, isOpen, close } = useOpenClose()

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

  useEffect(() => {
    if (unlockedCount === selectedCount) close()
  })

  useEffect(() => {
    if (isOpen) setTimeout(() => setFocus("password"), 50)
  }, [isOpen, setFocus])

  return (
    <>
      <Button type="button" onClick={open} disabled={!requiresAccountUnlock}>
        {t("Unlock")}
      </Button>
      <Modal isOpen={isOpen} onDismiss={close}>
        <ModalDialog title={t("Unlock accounts")} onClose={close}>
          <div className="text-body-secondary flex w-full justify-between">
            <div className={classNames(!!unlockedCount && "text-primary")}>
              {t("{{unlockedCount}} unlocked", { unlockedCount })}
            </div>
            <div>{t("{{selectedCount}} selected", { selectedCount })}</div>
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

          <form className="mt-16" onSubmit={handleSubmit(submit)} autoComplete="off">
            <FormFieldContainer error={errors.password?.message}>
              <FormFieldInputText
                before={<KeyIcon className="opacity-50" />}
                {...register("password")}
                type="password"
                placeholder={t("Enter password")}
                spellCheck={false}
                data-lpignore
                readOnly={isSubmitting}
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
