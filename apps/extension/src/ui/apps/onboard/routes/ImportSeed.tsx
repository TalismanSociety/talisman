import { yupResolver } from "@hookform/resolvers/yup"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { FormFieldTextarea } from "talisman-ui"
import * as yup from "yup"

import { OnboardButton } from "../components/OnboardButton"
import { OnboardDialog } from "../components/OnboardDialog"
import { OnboardFormField } from "../components/OnboardFormField"
import { useOnboard } from "../context"
import { Layout } from "../layout"

type FormData = {
  mnemonic?: string
}

const cleanupMnemonic = (input = "") =>
  input
    .trim()
    .toLowerCase()
    .split(/[\s\r\n]+/g) //split on whitespace or carriage return
    .filter(Boolean) //remove empty strings
    .join(" ")

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Onboarding",
  featureVersion: 4,
  page: "Onboarding - Step 2a - Input Seed",
}

export const ImportSeedPage = () => {
  const { t } = useTranslation("onboard")
  useAnalyticsPageView(ANALYTICS_PAGE)

  const schema = useMemo(
    () =>
      yup
        .object({
          mnemonic: yup
            .string()
            .trim()
            .required("")
            .transform(cleanupMnemonic)
            .test("is-valid-mnemonic", t("Invalid recovery phrase"), (val) =>
              api.accountValidateMnemonic(val as string)
            ),
        })
        .required(),
    [t]
  )

  const { data, updateData } = useOnboard()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues: data,
    resolver: yupResolver(schema),
  })

  const submit = useCallback(
    async (fields: FormData) => {
      updateData(fields)
      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "Submit",
        action: "Import wallet",
        properties: {
          importAccountType: data.importAccountType,
          importMethodType: data.importMethodType,
        },
      })
      navigate(`/password`)
    },
    [data.importAccountType, data.importMethodType, navigate, updateData]
  )

  return (
    <Layout withBack analytics={ANALYTICS_PAGE}>
      <div className="flex justify-center">
        <div className="w-[70.9rem]">
          <OnboardDialog title="Import wallet">
            <p>
              <Trans t={t}>
                Please enter your 12 or 24 word recovery phrase, with each word separated by a
                space. Please ensure no-one can see you entering your recovery phrase.
              </Trans>
            </p>
            <form onSubmit={handleSubmit(submit)}>
              <div className="mt-24">
                <OnboardFormField error={errors.mnemonic}>
                  <FormFieldTextarea
                    {...register("mnemonic")}
                    placeholder={t("Enter your recovery phrase")}
                    rows={5}
                    data-lpignore
                    spellCheck={false}
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                    className="placeholder:text-body-secondary/30 ring-grey-600 focus:ring-1"
                  />
                </OnboardFormField>
                <div className="h-12"></div>
                <OnboardButton className="h-28" type="submit" primary disabled={!isValid}>
                  {t("Import wallet")}
                </OnboardButton>
              </div>
            </form>
          </OnboardDialog>
        </div>
      </div>
    </Layout>
  )
}
