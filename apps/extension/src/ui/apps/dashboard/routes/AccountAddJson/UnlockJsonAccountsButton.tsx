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
  unlockAccounts: (password: string) => void
}> = ({ accounts, requiresAccountUnlock, unlockAccounts }) => {
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

  const { unlockedCount, selectedCount, progressStyle } = useMemo(() => {
    const selected = accounts.filter((a) => a.selected)
    const selectedCount = selected.length
    const unlockedCount = selected.filter((a) => !a.isLocked).length
    const progressStyle: CSSProperties = selectedCount
      ? { width: `${Math.round((unlockedCount / selectedCount) * 100)}%` }
      : {}
    return { unlockedCount, selectedCount, progressStyle }
  }, [accounts])

  useEffect(() => {
    if (unlockedCount === selectedCount) close()
  })

  return (
    <>
      <Button type="button" onClick={open} disabled={!requiresAccountUnlock}>
        {t("Unlock")}
      </Button>
      <Modal isOpen={isOpen} onDismiss={close}>
        <ModalDialog title={t("Unlock accounts")} onClose={close}>
          <div className="text-body-secondary flex w-full justify-between">
            <div className={classNames(!!unlockedCount && "text-primary")}>
              {unlockedCount} unlocked
            </div>
            <div>{selectedCount} selected</div>
          </div>
          <div className="bg-grey-800 my-4 flex h-5 rounded-lg">
            <div
              className="bg-primary-500 h-5 rounded-lg transition-all"
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
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
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
