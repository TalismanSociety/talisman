import { log } from "@core/log"
import { yupResolver } from "@hookform/resolvers/yup"
import { FadeIn } from "@talisman/components/FadeIn"
import { KeyIcon } from "@talisman/theme/icons"
import { FC, useCallback, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

import { useJsonAccountImport } from "./context"

type FormData = {
  password?: string
}

export const UnlockJsonFileForm: FC = () => {
  const { t } = useTranslation("account-add")
  const { unlockFile, requiresFilePassword } = useJsonAccountImport()

  const schema = yup
    .object({
      password: yup.string().required(""), // matches the medium strengh requirement
    })
    .required()

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    setFocus,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "all",
    reValidateMode: "onChange",
    resolver: yupResolver(schema),
  })

  const submit = useCallback(
    async (fields: FormData) => {
      try {
        clearErrors()
        if (!fields.password) return
        await unlockFile(fields.password)
      } catch (err) {
        log.error("failed to unlock", { err })
        setError("password", { message: t("Incorrect password") }, { shouldFocus: true })
      }
    },
    [clearErrors, setError, t, unlockFile]
  )

  useEffect(() => {
    if (requiresFilePassword) setFocus("password")
  }, [requiresFilePassword, setFocus])

  if (!requiresFilePassword) return null

  return (
    <FadeIn>
      <form onSubmit={handleSubmit(submit)} autoComplete="off">
        <div className="text-body-secondary mb-8">
          {t("Enter the password that was used to encrypt this JSON file.")}
        </div>
        <FormFieldContainer error={errors.password?.message}>
          <FormFieldInputText
            before={<KeyIcon className="opacity-50" />}
            {...register("password")}
            type="password"
            placeholder={t("Enter password")}
            spellCheck={false}
            data-lpignore
          />
        </FormFieldContainer>
        <div className="mt-8 flex w-full justify-end">
          <Button type="submit" primary disabled={!isValid} processing={isSubmitting}>
            {t("Unlock JSON file")}
          </Button>
        </div>
      </form>
    </FadeIn>
  )
}
