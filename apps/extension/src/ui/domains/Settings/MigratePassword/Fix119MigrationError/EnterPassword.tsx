import { yupResolver } from "@hookform/resolvers/yup"
import { useCallback } from "react"
import { useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { ModalDialog } from "talisman-ui"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

import { useFix119MigrationError } from "./context"

type FormData = {
  password: string
}

const schema = yup
  .object({
    password: yup.string().required(""),
  })
  .required()

export const EnterPasswordForm = () => {
  const { t } = useTranslation()
  const { attemptRecovery } = useFix119MigrationError()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const submit = useCallback(
    async ({ password }: FormData) => {
      try {
        // use mnemonicUnlock message because authenticate causes logout on failure, and we need the mnemonic anyway
        await attemptRecovery(password)
      } catch (err) {
        setError("password", {
          message: (err as Error)?.message ?? "",
        })
      }
    },
    [attemptRecovery, setError]
  )

  return (
    <ModalDialog title={t("Talisman Error Detected")}>
      <p className="text-body-secondary mb-10 text-sm">
        <Trans t={t}>Please enter your Talisman password to begin the recovery process.</Trans>
      </p>
      <form onSubmit={handleSubmit(submit)}>
        <FormFieldContainer error={errors.password?.message} className="mb-4">
          <FormFieldInputText
            {...register("password")}
            type="password"
            placeholder={t("Enter your password")}
            spellCheck={false}
            autoComplete="off"
            data-lpignore
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
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
