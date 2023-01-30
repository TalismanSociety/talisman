import { yupResolver } from "@hookform/resolvers/yup"
import { Box } from "@talisman/components/Box"
import { PasswordStrength } from "@talisman/components/PasswordStrength"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import * as yup from "yup"

import { OnboardButton } from "../components/OnboardButton"
import { OnboardDialog } from "../components/OnboardDialog"
import { OnboardFormField } from "../components/OnboardFormField"
import { useOnboard } from "../context"
import { Layout } from "../layout"

type FormData = {
  password?: string
  passwordConfirm?: string
  agreeToS?: boolean
}

const TITLE_NEW = "Choose a password"
const DESC_NEW =
  "Your password is used to unlock your wallet and is stored securely on your device. We recommend 12 characters, with uppercase and lowercase letters, symbols and numbers."

const TITLE_IMPORT = "First, let's set a password"
const DESC_IMPORT =
  "Before we import your wallet, we need to set a password for Talisman. This is used to unlock Talisman and is stored securely on your device. We recommend 12 characters, with uppercase and lowercase letters, symbols and numbers."

const schema = yup
  .object({
    password: yup.string().required("").min(6, "Password must be at least 6 characters long"), // matches the medium strengh requirement
    passwordConfirm: yup
      .string()
      .required("")
      .oneOf([yup.ref("password")], "Passwords must match"),
    agreeToS: yup.boolean().oneOf([true], ""),
  })
  .required()

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Onboarding",
  featureVersion: 4,
  page: "Onboarding - Step 2b - Password",
}

export const PasswordPage = () => {
  useAnalyticsPageView(ANALYTICS_PAGE)

  const { data, updateData, isResettingWallet } = useOnboard()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "all",
    reValidateMode: "onChange",
    defaultValues: data,
    resolver: yupResolver(schema),
  })
  const password = watch("password")

  // revalidate to get rid of "must match" error message after editing first field
  useEffect(() => {
    trigger()
  }, [trigger, password])

  const submit = useCallback(
    async (fields: FormData) => {
      updateData(fields)
      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "Submit",
        action: "Choose password continue button",
      })
      navigate(isResettingWallet ? "/onboard" : `/privacy`)
    },
    [navigate, updateData, isResettingWallet]
  )

  const [title, description] = useMemo(() => {
    const { importMethodType } = data
    const willImportAfterOnboard =
      importMethodType && ["json", "ledger", "private-key"].includes(importMethodType)
    return willImportAfterOnboard ? [TITLE_IMPORT, DESC_IMPORT] : [TITLE_NEW, DESC_NEW]
  }, [data])

  return (
    <Layout withBack analytics={ANALYTICS_PAGE}>
      <Box flex justify="center">
        <Box w={60}>
          <OnboardDialog title={title}>
            <p>{description}</p>
            <form onSubmit={handleSubmit(submit)} autoComplete="off">
              <Box flex column>
                <Box fontsize="small" margin="3.2rem 0 1.6rem 0">
                  Password strength: <PasswordStrength password={password} />
                </Box>
                <OnboardFormField error={errors.password}>
                  <input
                    {...register("password")}
                    type="password"
                    placeholder="Enter password"
                    autoComplete="new-password"
                    spellCheck={false}
                    data-lpignore
                    autoFocus
                  />
                </OnboardFormField>
                <OnboardFormField error={errors.passwordConfirm}>
                  <input
                    {...register("passwordConfirm")}
                    type="password"
                    autoComplete="off"
                    placeholder="Re-enter password"
                    spellCheck={false}
                    data-lpignore
                  />
                </OnboardFormField>
              </Box>
              <Box h={1.6} />
              <OnboardButton type="submit" primary disabled={!isValid} processing={isSubmitting}>
                Continue
              </OnboardButton>
            </form>
          </OnboardDialog>
        </Box>
      </Box>
    </Layout>
  )
}
