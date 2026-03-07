import { yupResolver } from "@hookform/resolvers/yup"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { CapsLockWarningIcon } from "@ui/components/CapsLockWarningIcon"
import { FormFieldContainer } from "@ui/components/FormFieldContainer"
import { FormFieldInputText } from "@ui/components/FormFieldInputText"
import { ModalDialog } from "@ui/components/ModalDialog"
import { useCallback, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import * as yup from "yup"

import { useMigratePassword } from "./context"

type FormData = {
  password: string
}

const schema = yup
  .object({
    password: yup.string().required(" "),
  })
  .required()

export const EnterPasswordForm = () => {
  const { t } = useTranslation()
  const { setPassword, setMnemonic, mnemonicId } = useMigratePassword()

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const submit = useCallback(
    async ({ password }: FormData) => {
      try {
        // use mnemonicUnlock message because authenticate causes logout on failure, and we need the mnemonic anyway
        const mnemonic = await api.mnemonicUnlock(mnemonicId, password)
        if (mnemonic) {
          setPassword(password)
          setMnemonic(mnemonic)
        } else throw new Error(t("Incorrect password"))
      } catch (err) {
        setError("password", {
          message: (err as Error)?.message ?? "",
        })
      }
    },
    [setPassword, setMnemonic, setError, t, mnemonicId]
  )

  useEffect(() => {
    return () => {
      setValue("password", "")
    }
  }, [setValue])

  return (
    <ModalDialog title="Security Upgrade">
      <p className="mb-10 text-body-secondary text-sm">
        <Trans t={t}>
          We have upgraded our security measures, including an updated password policy and advanced
          password encryption.{" "}
          <a
            href="https://medium.com/we-are-talisman/talismans-security-model-1e60391694c0"
            target="_blank"
            rel="noreferrer noopener"
            className="text-white opacity-100"
          >
            Learn more
          </a>{" "}
          about our new security features.
        </Trans>
      </p>
      <p className="text-body-secondary text-sm">{t("Enter your current password to continue")}</p>
      <form onSubmit={handleSubmit(submit)}>
        <FormFieldContainer error={errors.password?.message} className="mb-4">
          <FormFieldInputText
            {...register("password")}
            type="password"
            placeholder={t("Enter your password")}
            spellCheck={false}
            autoComplete="off"
            data-lpignore
            autoFocus
            after={<CapsLockWarningIcon />}
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
