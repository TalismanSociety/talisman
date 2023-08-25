import { yupResolver } from "@hookform/resolvers/yup"
import { PasswordStrength } from "@talisman/components/PasswordStrength"
import imgPassword from "@talisman/theme/images/onboard_password_character.png"
import { classNames } from "@talismn/util"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useIsLoggedIn } from "@ui/hooks/useIsLoggedIn"
import { useCallback, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { FormFieldInputText } from "talisman-ui"
import { Button } from "talisman-ui"
import * as yup from "yup"

import { OnboardDialog } from "../components/OnboardDialog"
import { OnboardFormField } from "../components/OnboardFormField"
import { onboardBackgroundClassNames } from "../components/OnboardStyles"
import { useOnboard } from "../context"
import { Layout } from "../layout"

type FormData = {
  password?: string
  passwordConfirm?: string
}

const INPUT_CONTAINER_PROPS_PASSWORD = { className: "!bg-white/5 h-28" }

const schema = yup
  .object({
    password: yup.string().required("").min(6, "Password must be at least 6 characters long"), // matches the medium strengh requirement
    passwordConfirm: yup
      .string()
      .required("")
      .oneOf([yup.ref("password")], "Passwords must match"),
  })
  .required()

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Onboarding",
  featureVersion: 5,
  page: "Onboarding - Step 2 - Password",
}

export const PasswordPage = () => {
  const { t } = useTranslation("onboard")
  useAnalyticsPageView(ANALYTICS_PAGE)

  const { data, createPassword, isResettingWallet, passwordExists, setOnboarded } = useOnboard()

  const navigate = useNavigate()
  const isLoggedIn = useIsLoggedIn()

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    setError,
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

  useEffect(() => {
    return () => {
      setValue("password", "")
      setValue("passwordConfirm", "")
    }
  }, [setValue])

  const submit = useCallback(
    async (fields: FormData) => {
      const { password, passwordConfirm } = fields
      if (!password || !passwordConfirm) return

      try {
        await createPassword(password, passwordConfirm)
      } catch (e) {
        setError("password", { message: (e as Error).message })
        return
      }
      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "Submit",
        action: "Choose password continue button",
      })
      if (isLoggedIn === "TRUE") navigate(isResettingWallet ? "/account" : `/privacy`)
      else setOnboarded()
    },
    [navigate, setOnboarded, setError, createPassword, isResettingWallet, isLoggedIn]
  )

  return (
    <Layout withBack analytics={ANALYTICS_PAGE}>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <img src={imgPassword} width="960" className="absolute left-32 top-[25rem] opacity-30 " />
      {passwordExists && (
        <OnboardDialog title={t("You've already set your password")}>
          <div className="text-body-secondary flex flex-col gap-8">
            <p>
              {t(
                "You can change your password in the settings at any time after you've onboarded."
              )}
            </p>
            <p>
              {t(
                "If you can't remember the password you set, you should re-install Talisman now, and restart this onboarding process."
              )}
            </p>
            <Button
              fullWidth
              primary
              className="mt-16"
              type="button"
              onClick={() => navigate(isResettingWallet ? "/account" : `/privacy`)}
            >
              {t("Continue")}
            </Button>
          </div>
        </OnboardDialog>
      )}
      {!passwordExists && (
        <OnboardDialog title={t("First, let's set a password")}>
          <p>
            {t(
              "Your password is used to unlock your wallet and is stored securely on your device. We recommend 12 characters, with uppercase and lowercase letters, symbols and numbers."
            )}
          </p>
          <form onSubmit={handleSubmit(submit)} autoComplete="off">
            <div className="flex flex-col">
              <div className="text-body-secondary mb-8 mt-16 text-sm">
                {t("Password strength")}: <PasswordStrength password={password} />
              </div>
              <OnboardFormField error={errors.password}>
                <FormFieldInputText
                  {...register("password")}
                  type="password"
                  placeholder={t("Enter password")}
                  autoComplete="new-password"
                  spellCheck={false}
                  data-lpignore
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  className="placeholder:text-body-secondary/30 !bg-transparent !px-0"
                  containerProps={INPUT_CONTAINER_PROPS_PASSWORD}
                />
              </OnboardFormField>
              <OnboardFormField error={errors.passwordConfirm}>
                <FormFieldInputText
                  {...register("passwordConfirm")}
                  type="password"
                  autoComplete="off"
                  placeholder={t("Confirm password")}
                  spellCheck={false}
                  data-lpignore
                  className="placeholder:text-body-secondary/30 !bg-transparent !px-0"
                  containerProps={INPUT_CONTAINER_PROPS_PASSWORD}
                />
              </OnboardFormField>
            </div>
            <Button
              fullWidth
              primary
              type="submit"
              className={classNames(
                `${
                  !isValid
                    ? `${onboardBackgroundClassNames} text-body-secondary cursor-not-allowed border-none`
                    : ""
                }`
              )}
              disabled={!isValid}
              processing={isSubmitting}
            >
              {t("Continue")}
            </Button>
          </form>
        </OnboardDialog>
      )}
    </Layout>
  )
}
