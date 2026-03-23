import { IS_FIREFOX } from "@common/constants"
import { yupResolver } from "@hookform/resolvers/yup"
import { type AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { Button } from "@ui/components/Button"
import { CapsLockWarningMessage } from "@ui/components/CapsLockWarningMessage"
import { FormFieldContainer } from "@ui/components/FormFieldContainer"
import { FormFieldInputText } from "@ui/components/FormFieldInputText"
import { PasswordStrength } from "@ui/components/PasswordStrength"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import imgPassword from "@ui/theme/images/onboard_password_character.png"
import { classNames } from "@ui/util/cn"
import { useCallback, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import * as yup from "yup"

import { OnboardDialog } from "../components/OnboardDialog"
import { useOnboard } from "../context"
import { OnboardLayout } from "../OnboardLayout"

type FormData = {
  password: string
  passwordConfirm: string
}

const INPUT_CONTAINER_PROPS_PASSWORD = { className: "h-28 opacity-70" }

const schema = yup
  .object({
    password: yup.string().required(" ").min(6, "Password must be at least 6 characters long"), // matches the medium strengh requirement
    passwordConfirm: yup.string().required(" "),
  })
  .test((value, ctx) => {
    const { password, passwordConfirm } = value
    if (password && passwordConfirm && password !== passwordConfirm) {
      return ctx.createError({
        path: "passwordConfirm",
        message: "Passwords must match",
      })
    }
    return true
  })

  .required()

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Onboarding",
  featureVersion: 5,
  page: "Onboarding - Step 2 - Password",
}

export const PasswordPage = () => {
  const { t } = useTranslation()
  useAnalyticsPageView(ANALYTICS_PAGE)

  const { data, createPassword, isResettingWallet, passwordExists, setOnboarded } = useOnboard()

  const navigate = useNavigate()

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
  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  useEffect(() => {
    trigger()
  }, [trigger, password])

  useEffect(() => {
    return () => {
      setValue("password", "")
      setValue("passwordConfirm", "")
    }
  }, [setValue])

  const navigateNext = useCallback(() => {
    if (isResettingWallet || IS_FIREFOX) setOnboarded()
    else navigate("/privacy")
  }, [isResettingWallet, setOnboarded, navigate])

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
      navigateNext()
    },
    [setError, createPassword, navigateNext]
  )

  return (
    <OnboardLayout withBack analytics={ANALYTICS_PAGE} className="min-h-150 min-w-150">
      {/* biome-ignore lint/a11y/useAltText: legacy */}
      <img src={imgPassword} width="960" className="fixed top-62.5 left-32 opacity-30" />
      {passwordExists && (
        <OnboardDialog title={t("You've already set your password")}>
          <div className="flex flex-col gap-8 text-body-secondary">
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
            <Button fullWidth primary className="mt-16" type="button" onClick={navigateNext}>
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
            <div className="flex flex-col pb-12">
              <div className="mt-12 mb-4 flex h-[1.2em] items-center justify-between text-sm">
                <div
                  className={classNames(
                    password ? "text-body-secondary" : "text-body-secondary/50"
                  )}
                >
                  {t("Password strength")}: <PasswordStrength password={password} />
                </div>
                <div>
                  <CapsLockWarningMessage />
                </div>
              </div>
              <FormFieldContainer error={errors.password?.message}>
                <FormFieldInputText
                  {...register("password")}
                  type="password"
                  placeholder={t("Enter password")}
                  autoComplete="new-password"
                  spellCheck={false}
                  data-lpignore
                  autoFocus
                  containerProps={INPUT_CONTAINER_PROPS_PASSWORD}
                />
              </FormFieldContainer>
              <FormFieldContainer error={errors.passwordConfirm?.message}>
                <FormFieldInputText
                  {...register("passwordConfirm")}
                  type="password"
                  autoComplete="off"
                  placeholder={t("Confirm password")}
                  spellCheck={false}
                  data-lpignore
                  containerProps={INPUT_CONTAINER_PROPS_PASSWORD}
                />
              </FormFieldContainer>
            </div>
            <Button
              fullWidth
              primary
              type="submit"
              className={classNames(!isValid && "opacity-70")}
              disabled={!isValid}
              processing={isSubmitting}
              data-testid="onboarding-password-confirm-button"
            >
              {t("Continue")}
            </Button>
          </form>
        </OnboardDialog>
      )}
    </OnboardLayout>
  )
}
