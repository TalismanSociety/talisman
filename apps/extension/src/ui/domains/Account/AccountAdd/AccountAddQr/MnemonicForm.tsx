import { yupResolver } from "@hookform/resolvers/yup"
import { FadeIn } from "@talisman/components/FadeIn"
import { api } from "@ui/api"
import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { Button, FormFieldTextarea } from "talisman-ui"
import * as yup from "yup"

type FormData = {
  mnemonic: string
}

const cleanupMnemonic = (input = "") =>
  input
    .trim()
    .toLowerCase()
    .split(/[\s\r\n]+/g) //split on whitespace or carriage return
    .filter(Boolean) //remove empty strings
    .join(" ")

const testValidMnemonic = async (val?: string) => {
  // Don't bother calling the api if the mnemonic isn't the right length
  if (!val || ![12, 24].includes(val.split(" ").length)) return false
  return await api.validateMnemonic(val)
}

type FormProps = {
  onSubmit: (data: FormData) => void
  onCancel: () => void
  defaultValues?: Partial<FormData>
}

const schema = yup
  .object({
    mnemonic: yup
      .string()
      .trim()
      .required("")
      .transform(cleanupMnemonic)
      .test("valid-mnemonic", "Invalid recovery phrase", testValidMnemonic),
  })
  .required()

export const MnemonicForm = ({ onSubmit, onCancel }: FormProps) => {
  const { t } = useTranslation("admin")
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const { mnemonic } = watch()
  const wordCount = useMemo(() => cleanupMnemonic(mnemonic).split(" ").length ?? 0, [mnemonic])

  useEffect(() => {
    return () => {
      setValue("mnemonic", "")
    }
  }, [setValue])

  return (
    <FadeIn>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="text-body-secondary mb-6">
          <Trans t={t}>
            Please enter a mnemonic you would like to use as your Verifier Certificate Mnemonic. You
            should not enter your main Polkadot Vault account mnemonic here.
          </Trans>
        </div>
        <FormFieldTextarea
          {...register("mnemonic")}
          placeholder={t(`Enter your 12 or 24 word mnemonic`)}
          rows={5}
          data-lpignore
          spellCheck={false}
        />
        <div className="my-8 flex justify-between text-xs">
          {mnemonic && (
            <div className="text-body-secondary">
              {t("Word count: {{wordCount}}", { wordCount })}
            </div>
          )}
          <div className="text-alert-warn text-right">{errors.mnemonic?.message}</div>
        </div>
        <div className="flex justify-between gap-8">
          <Button type="button" fullWidth onClick={onCancel}>
            {t("Cancel")}
          </Button>
          <Button type="submit" fullWidth primary disabled={!isValid} processing={isSubmitting}>
            {t("Import")}
          </Button>
        </div>
      </form>
    </FadeIn>
  )
}
