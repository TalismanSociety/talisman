import { ChangePasswordStatusUpdateStatus, ChangePasswordStatusUpdateType } from "@extension/core"
import { yupResolver } from "@hookform/resolvers/yup"
import { CapsLockWarningMessage } from "@talisman/components/CapsLockWarningMessage"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { notify } from "@talisman/components/Notifications"
import { InfoIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

import { ChangePasswordModal } from "./ChangePasswordModal"

type FormData = {
  currentPw: string
  newPw: string
  newPwConfirm: string
}

export const ChangePasswordPage = () => {
  const { t } = useTranslation("admin")
  const navigate = useNavigate()
  const { allBackedUp } = useMnemonicBackup()
  const [progress, setProgress] = useState<ChangePasswordStatusUpdateType>()

  const schema = useMemo(
    () =>
      yup
        .object({
          currentPw: yup.string().required(""),
          newPw: yup.string().required("").min(6, t("Password must be at least 6 characters long")),
          newPwConfirm: yup
            .string()
            .required("")
            .oneOf([yup.ref("newPw")], t("Passwords must match!")),
        })
        .required(),
    [t]
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    setError,
    setValue,
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  useEffect(() => {
    if (progress === ChangePasswordStatusUpdateStatus.DONE) {
      notify({
        type: "success",
        title: t("Password changed"),
      })
      navigate("/portfolio")
    }
  }, [progress, navigate, t])

  const subscribeChangePassword = useCallback(
    async ({ currentPw, newPw, newPwConfirm }: FormData) => {
      // sets up a custom promise, resolving when the password change is done or there is an error
      return await new Promise<void>((resolve, reject) =>
        api.changePasswordSubscribe(currentPw, newPw, newPwConfirm, ({ status, message }) => {
          setProgress(status)
          if (status === ChangePasswordStatusUpdateStatus.ERROR) {
            reject(new Error(message))
          }
          if (status === ChangePasswordStatusUpdateStatus.DONE) {
            resolve()
          }
        })
      ).catch((err) => {
        switch (err.message) {
          case "Incorrect password":
            setError("currentPw", { message: err.message })
            break
          case "New password and new password confirmation must match":
            setError("newPwConfirm", { message: err.message })
            break
          default:
            notify({
              type: "error",
              title: t("Error changing password"),
              subtitle: err.message,
            })
        }
      })
    },
    [setError, t]
  )

  const handleBackupClick = useCallback(() => {
    navigate("/settings/mnemonics")
  }, [navigate])

  useEffect(() => {
    return () => {
      setValue("currentPw", "")
      setValue("newPw", "")
      setValue("newPwConfirm", "")
    }
  }, [setValue])

  return (
    <>
      <DashboardLayout withBack centered>
        <HeaderBlock title={t("Change your password")} />
        <p className="text-body-secondary my-10">
          {t(
            "Your password is used to unlock your wallet and is stored securely on your device. We recommend 12 characters, with uppercase and lowercase letters, symbols, and numbers."
          )}
        </p>
        {!allBackedUp && (
          <div className="mnemonic-warning flex flex-col gap-0.5 rounded-sm border border-white p-8">
            <div className="flex items-center justify-between">
              <InfoIcon className="text-primary mr-10 text-3xl" />
              {t(
                "You'll need to confirm your recovery phrase is backed up before you change your password."
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={handleBackupClick}>{t("Backup Recovery Phrase")}</Button>
            </div>
          </div>
        )}

        <form className="mt-8" onSubmit={handleSubmit(subscribeChangePassword)}>
          <FormFieldContainer error={errors.currentPw?.message} label={t("Old Password")}>
            <FormFieldInputText
              {...register("currentPw")}
              placeholder={t("Enter Old Password")}
              spellCheck={false}
              autoComplete="off"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              data-lpignore
              type="password"
              tabIndex={0}
              disabled={!allBackedUp}
            />
          </FormFieldContainer>
          <FormFieldContainer error={errors.newPw?.message} label={t("New Password")}>
            <FormFieldInputText
              {...register("newPw")}
              placeholder={t("Enter New Password")}
              spellCheck={false}
              autoComplete="new-password"
              data-lpignore
              type="password"
              tabIndex={0}
              disabled={!allBackedUp}
            />
          </FormFieldContainer>
          <FormFieldContainer error={errors.newPwConfirm?.message}>
            <FormFieldInputText
              {...register("newPwConfirm")}
              placeholder={t("Confirm New Password")}
              spellCheck={false}
              autoComplete="off"
              data-lpignore
              type="password"
              tabIndex={0}
              disabled={!allBackedUp}
            />
          </FormFieldContainer>
          <div className="mt-8 flex items-center justify-between">
            <div>
              <CapsLockWarningMessage />
            </div>
            <Button
              className="w-[20rem]"
              type="submit"
              primary
              disabled={!isValid || !allBackedUp}
              processing={isSubmitting}
            >
              {t("Submit")}
            </Button>
          </div>
        </form>
        <ChangePasswordModal isOpen={isSubmitting} progressStage={progress} />
      </DashboardLayout>
    </>
  )
}
