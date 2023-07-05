import { yupResolver } from "@hookform/resolvers/yup"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { notify } from "@talisman/components/Notifications"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { InfoIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import { MnemonicModal } from "@ui/domains/Settings/MnemonicModal"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useCallback } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

import { DashboardLayout } from "../../layout/DashboardLayout"

type FormData = {
  currentPw: string
  newPw: string
  newPwConfirm: string
}

export const ChangePasswordPage = () => {
  const { t } = useTranslation("admin")
  const navigate = useNavigate()
  const { isNotConfirmed } = useMnemonicBackup()
  const { isOpen, open, close } = useOpenClose()

  const schema = yup
    .object({
      currentPw: yup.string().required(""),
      newPw: yup.string().required("").min(6, t("Password must be at least 6 characters long")),
      newPwConfirm: yup
        .string()
        .required("")
        .oneOf([yup.ref("newPw")], t("Passwords must match!")),
    })
    .required()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    setError,
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const submit = useCallback(
    async ({ currentPw, newPw, newPwConfirm }: FormData) => {
      try {
        await api.changePassword(currentPw, newPw, newPwConfirm)
        notify({
          type: "success",
          title: t("Password changed"),
        })
        navigate("/portfolio")
      } catch (err) {
        if ((err as Error).message === "Incorrect password")
          setError("currentPw", { message: (err as Error).message })
        if ((err as Error).message === "New password and new password confirmation must match")
          setError("newPwConfirm", { message: (err as Error).message })
        else {
          notify({
            type: "error",
            title: t("Error changing password"),
            subtitle: (err as Error)?.message ?? "",
          })
        }
      }
    },
    [navigate, setError, t]
  )

  return (
    <>
      <DashboardLayout withBack centered>
        <HeaderBlock title={t("Change your password")} />
        <p className="text-body-secondary my-10">
          {t(
            "Your password is used to unlock your wallet and is stored securely on your device. We recommend 12 characters, with uppercase and lowercase letters, symbols, and numbers."
          )}
        </p>
        {isNotConfirmed && (
          <div className="mnemonic-warning flex flex-col gap-0.5 rounded-sm border border-white p-8">
            <div className="flex items-center justify-between">
              <InfoIcon className="text-primary mr-10 text-3xl" />
              {t(
                "You'll need to confirm your recovery phrase is backed up before you change your password."
              )}
            </div>
            <div className="flex justify-end">
              <Button onClick={open}>{t("Backup Seed Phrase")}</Button>
            </div>
          </div>
        )}

        <form className="mt-8" onSubmit={handleSubmit(submit)}>
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
              disabled={isNotConfirmed}
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
              disabled={isNotConfirmed}
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
              disabled={isNotConfirmed}
            />
          </FormFieldContainer>
          <div className="mt-8 flex justify-end">
            <Button
              className="w-[20rem]"
              type="submit"
              primary
              disabled={!isValid || isNotConfirmed}
              processing={isSubmitting}
            >
              {t("Submit")}
            </Button>
          </div>
        </form>
      </DashboardLayout>
      <MnemonicModal open={isOpen} onClose={close} />
    </>
  )
}
