import { DEBUG } from "@core/constants"
import { log } from "@core/log"
import { yupResolver } from "@hookform/resolvers/yup"
import { FadeIn } from "@talisman/components/FadeIn"
import { KeyIcon } from "@talisman/theme/icons"
import { FC, useCallback, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

type FormData = {
  password?: string
}

export const UnlockJsonFileForm: FC<{
  unlockFile: (password: string) => Promise<void>
}> = ({ unlockFile }) => {
  const { t } = useTranslation("account-add")

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
    setValue,
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
    setFocus("password")
  }, [setFocus])

  // TODO REMOVE BEFORE MERGE
  useEffect(() => {
    if (DEBUG) {
      setTimeout(() => {
        setValue("password", "PasswordG", { shouldValidate: true })
        setTimeout(() => {
          handleSubmit(submit)()
        }, 100)
      }, 100)
    }
  }, [handleSubmit, setValue, submit])

  return (
    <FadeIn>
      <form onSubmit={handleSubmit(submit)} autoComplete="off">
        <div className="text-body-secondary mb-8">
          {t("Please enter the password you set when creating your polkadot.js account")}
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
            {t("Unlock")}
          </Button>
        </div>
      </form>
    </FadeIn>
  )
}
