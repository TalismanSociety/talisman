import { yupResolver } from "@hookform/resolvers/yup"
import { CapsLockWarningMessage } from "@talisman/components/CapsLockWarningMessage"
import { PasswordStrength } from "@talisman/components/PasswordStrength"
import { useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { ModalDialog } from "talisman-ui"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

import { useMigratePassword } from "./context"

type FormData = {
  newPw: string
  newPwConfirm: string
}

export const NewPasswordForm = () => {
  const { t } = useTranslation()
  const { setNewPassword } = useMigratePassword()

  const schema = useMemo(
    () =>
      yup
        .object({
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
    watch,
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const newPwWatch = watch("newPw")

  const submit = useCallback(({ newPw }: FormData) => setNewPassword(newPw), [setNewPassword])

  return (
    <ModalDialog title={t("Enter new password")}>
      <p className="text-body-secondary mb-16 text-sm">
        {t(
          "Your password is used to unlock your wallet and is stored securely on your device. We recommend 12 characters, with uppercase and lowercase letters, symbols and numbers."
        )}
      </p>

      <form onSubmit={handleSubmit(submit)}>
        <div className="mb-6 flex h-[1.2em] items-center justify-between text-sm">
          <div className="text-body-disabled">
            {t("Password strength:")} <PasswordStrength password={newPwWatch} />
          </div>
          <div>
            <CapsLockWarningMessage />
          </div>
        </div>
        <FormFieldContainer error={errors.newPw?.message} className="mb-12">
          <FormFieldInputText
            {...register("newPw")}
            placeholder={t("Enter New Password")}
            spellCheck={false}
            autoComplete="new-password"
            data-lpignore
            type="password"
            tabIndex={0}
          />
        </FormFieldContainer>
        <FormFieldContainer error={errors.newPwConfirm?.message} className="mb-12">
          <FormFieldInputText
            {...register("newPwConfirm")}
            placeholder={t("Confirm New Password")}
            spellCheck={false}
            autoComplete="off"
            data-lpignore
            type="password"
            tabIndex={0}
          />
        </FormFieldContainer>
        <Button
          className="mt-12"
          type="submit"
          primary
          fullWidth
          disabled={!isValid}
          processing={isSubmitting}
        >
          {t("Continue")}
        </Button>
      </form>
    </ModalDialog>
  )
}
