import { yupResolver } from "@hookform/resolvers/yup"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
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

const schema = yup
  .object({
    mnemonic: yup
      .string()
      .trim()
      .required("")
      .transform(cleanupMnemonic)
      .test("is-valid-mnemonic", "Invalid recovery phrase", (val) =>
        api.accountValidateMnemonic(val as string)
      ),
  })
  .required()

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Onboarding",
  featureVersion: 4,
  page: "Onboarding - Step 2a - Input Seed",
}

export const ImportSeedPage = () => {
  useAnalyticsPageView(ANALYTICS_PAGE)

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
              Please enter your 12 or 24 word recovery phrase, with each word separated by a space.
              Please ensure no-one can see you entering your recovery phrase.
            </p>
            <form onSubmit={handleSubmit(submit)}>
              <div className="mt-24">
                <OnboardFormField error={errors.mnemonic}>
                  <textarea
                    {...register("mnemonic")}
                    placeholder="Enter your recovery phrase"
                    rows={5}
                    data-lpignore
                    spellCheck={false}
                    autoFocus
                  />
                </OnboardFormField>
                <div className="h-12"></div>
                <OnboardButton type="submit" primary disabled={!isValid}>
                  Import wallet
                </OnboardButton>
              </div>
            </form>
          </OnboardDialog>
        </div>
      </div>
    </Layout>
  )
}
