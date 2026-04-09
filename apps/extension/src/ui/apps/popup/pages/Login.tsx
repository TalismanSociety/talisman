import { yupResolver } from "@hookform/resolvers/yup"
import { EyeIcon, EyeOffIcon, UserCheckIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { LoginBackground } from "@ui/apps/popup/components/LoginBackground"
import { Button } from "@ui/components/Button"
import { CapsLockWarningIcon } from "@ui/components/CapsLockWarningIcon"
import { FormFieldInputText } from "@ui/components/FormFieldInputText"
import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useFirstAccountColors } from "@ui/hooks/useFirstAccountColors"
import { useSetting } from "@ui/state/settings"
import { HandMonoLogo } from "@ui/theme/logos"
import { cn } from "@ui/util/cn"
import { unlockWithBiometric } from "@ui/util/webauthnPrf"
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  type SubmitHandler,
  type UseFormHandleSubmit,
  type UseFormSetValue,
  type UseFormWatch,
  useForm,
} from "react-hook-form"
import { useTranslation } from "react-i18next"
import * as yup from "yup"

import { PopupContent, PopupFooter, PopupLayout } from "../Layout/PopupLayout"
import { ResetWallet } from "./ResetWallet"

const HideBalancesToggle = () => {
  const { t } = useTranslation()
  const [hideBalances, setHideBalances] = useSetting("hideBalances")

  return (
    <Tooltip placement="bottom-end">
      <TooltipTrigger asChild>
        <label
          htmlFor="showBalances"
          className={cn("absolute top-10 right-10 z-20", "inline-flex cursor-pointer items-center")}
        >
          <input
            id="showBalances"
            type="checkbox"
            className="peer sr-only"
            defaultChecked={!hideBalances}
            onChange={(e) => setHideBalances(!e.target.checked)}
          />
          <div
            className={cn(
              "peer h-14 w-28 shrink-0 rounded-full bg-grey-600",
              "peer-focus:outline-hidden peer-focus-visible:ring-2 peer-focus-visible:ring-body"
            )}
          ></div>
          <div
            className={cn(
              "absolute top-1 left-1 flex h-12 w-12",
              "rounded-full bg-grey-800",
              "transition peer-checked:translate-x-14 peer-checked:bg-primary"
            )}
          >
            <EyeIcon
              className={cn(
                "absolute top-2 left-2 h-8 w-8",
                "text-body-black transition-opacity",
                hideBalances ? "opacity-0" : "opacity-100"
              )}
            />
            <EyeOffIcon
              className={cn(
                "absolute top-2 left-2 h-8 w-8",
                "text-body transition-opacity",
                !hideBalances ? "opacity-0" : "opacity-100"
              )}
            />
          </div>
        </label>
      </TooltipTrigger>
      <TooltipContent>
        {hideBalances ? t("Balances: hidden") : t("Balances: visible")}
      </TooltipContent>
    </Tooltip>
  )
}

type FormData = {
  password: string
}

const schema = yup
  .object({
    password: yup.string().required(" "),
  })
  .required()

const INPUT_CONTAINER_PROPS = { className: "bg-white/10" }

const Background = () => {
  const colors = useFirstAccountColors()

  return <LoginBackground className="absolute top-0 left-0 h-full w-full" colors={colors} />
}

const BiometricUnlockButton = () => {
  const { t } = useTranslation()
  const [enrolled, setEnrolled] = useState(false)
  const [processing, setProcessing] = useState(false)
  const triggeredRef = useRef(false)

  useEffect(() => {
    api.biometricIsEnrolled().then(setEnrolled)
    const unsubscribe = api.biometricIsEnrolledSubscribe(({ enrolled }) => setEnrolled(enrolled))
    return () => unsubscribe()
  }, [])

  const handleBiometricUnlock = useCallback(async () => {
    if (processing) return
    setProcessing(true)
    try {
      const enrollmentData = await api.biometricGetEnrollmentData()
      if (
        !enrollmentData.credentialId ||
        !enrollmentData.prfSalt ||
        !enrollmentData.encryptedPassword ||
        !enrollmentData.iv
      )
        return

      const hashedPassword = await unlockWithBiometric(
        enrollmentData.credentialId,
        enrollmentData.prfSalt,
        enrollmentData.encryptedPassword,
        enrollmentData.iv
      )

      const result = await api.biometricAuthenticateHashed(hashedPassword)
      if (!result) return

      const qs = new URLSearchParams(window.location.search)
      if (qs.get("closeAfterLogin") === "true") window.close()
    } catch {
      // silently handle cancellation and errors — user can fall back to password
    } finally {
      setProcessing(false)
    }
  }, [processing])

  // auto-trigger biometric on first render
  useEffect(() => {
    if (!enrolled || triggeredRef.current) return
    triggeredRef.current = true
    handleBiometricUnlock()
  }, [enrolled, handleBiometricUnlock])

  if (!enrolled) return null

  return (
    <button
      type="button"
      onClick={handleBiometricUnlock}
      disabled={processing}
      className={cn(
        "flex cursor-pointer items-center justify-center gap-4",
        "text-body-disabled text-sm transition-colors hover:text-white",
        processing && "animate-pulse"
      )}
    >
      <UserCheckIcon className="text-lg" />
      {t("Unlock with biometrics")}
    </button>
  )
}

const Login = ({ setShowResetWallet }: { setShowResetWallet: () => void }) => {
  const { t } = useTranslation()
  const { popupOpenEvent } = useAnalytics()

  useEffect(() => {
    popupOpenEvent("auth")
  }, [popupOpenEvent])

  const {
    watch,
    register,
    handleSubmit,
    setError,
    setValue,
    setFocus,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const submit = useCallback<SubmitHandler<FormData>>(
    async ({ password }) => {
      try {
        const result = await api.authenticate(password)
        if (result) {
          const qs = new URLSearchParams(window.location.search)
          if (qs.get("closeAfterLogin") === "true") window.close()
        } else throw new Error(t("Talisman access denied"))
      } catch (err) {
        setError("password", { message: (err as Error)?.message ?? t("Unknown error") })
        setFocus("password", { shouldSelect: true })
      }
    },
    [setError, setFocus, t]
  )

  useEffect(() => {
    setFocus("password")
  }, [setFocus])

  useEffect(() => {
    return () => {
      setValue("password", "")
    }
  }, [setValue])

  useDevModeAutologin({ watch, setValue, handleSubmit, submit })

  return (
    <PopupLayout>
      <Suspense fallback={<SuspenseTracker name="Background" />}>
        <Background />
        <HideBalancesToggle />
        <VersionInfo />
      </Suspense>
      <PopupContent
        className={cn("z-10 select-none pt-32 text-center", isSubmitting && "animate-pulse")}
      >
        <div className="mt-[60px]">
          <HandMonoLogo className="inline-block text-[64px]" />
        </div>
        <h1 className="mt-[34px] font-surtExpanded text-lg">{t("Unlock the Talisman")}</h1>
        {errors.password?.message && (
          <div className="mt-8 text-alert-warn">{errors.password?.message}</div>
        )}
      </PopupContent>
      <PopupFooter className="z-10">
        <form className="flex flex-col items-center gap-6" onSubmit={handleSubmit(submit)}>
          <FormFieldInputText
            {...register("password")}
            type="password"
            placeholder={t("Enter password")}
            spellCheck={false}
            autoComplete="off"
            data-lpignore
            containerProps={INPUT_CONTAINER_PROPS}
            className="placeholder:text-grey-500"
            after={<CapsLockWarningIcon />}
          />
          <Button
            type="submit"
            fullWidth
            primary
            disabled={!isValid}
            processing={isSubmitting}
            className={cn(!isValid && "bg-white/10")}
          >
            {t("Unlock")}
          </Button>
          <BiometricUnlockButton />
          <button
            type="button"
            className="mt-2 cursor-pointer text-body-disabled text-sm transition-colors hover:text-white"
            onClick={setShowResetWallet}
          >
            {t("Forgot Password?")}
          </button>
        </form>
      </PopupFooter>
    </PopupLayout>
  )
}

export const LoginViewManager = () => {
  const [showResetWallet, setShowResetWallet] = useState(false)

  if (showResetWallet) return <ResetWallet closeResetWallet={() => setShowResetWallet(false)} />
  return <Login setShowResetWallet={() => setShowResetWallet(true)} />
}

/** autologin, for developers only */
const useDevModeAutologin = ({
  watch,
  setValue,
  handleSubmit,
  submit,
}: {
  watch: UseFormWatch<FormData>
  setValue: UseFormSetValue<FormData>
  handleSubmit: UseFormHandleSubmit<FormData, undefined>
  submit: SubmitHandler<FormData>
}) => {
  const [passwordField] = watch(["password"])

  // set password field
  useLayoutEffect(() => {
    if (process.env.NODE_ENV === "production") return
    if (!process.env.PASSWORD) return
    setValue("password", process.env.PASSWORD)
  }, [setValue])

  // submit login form
  //
  // if we don't wait for the password to be set,
  // then handleSubmit(submit)() won't show the loading state in the UI
  //
  // also, we want to make sure we only trigger the login once,
  // otherwise, due to bcrypt hashing, the user will have to wait for longer than necessary
  const autologinTriggered = useRef(false)
  useLayoutEffect(() => {
    if (process.env.NODE_ENV === "production") return
    if (!process.env.PASSWORD) return
    if (!passwordField) return
    if (autologinTriggered.current) return

    autologinTriggered.current = true
    handleSubmit(submit)()
  }, [handleSubmit, passwordField, submit])
}

const VersionInfo = () => {
  const [clickCount, setClickCount] = useState(0)

  const handleClick = useCallback(() => {
    if (clickCount === 9) window.open("./support.html", "_blank")
    else setClickCount((prev) => prev + 1)
  }, [clickCount])

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: legacy
    // biome-ignore lint/a11y/noStaticElementInteractions: legacy
    <div
      onClick={handleClick}
      className="absolute top-10 left-10 z-20 flex h-14 select-none items-center justify-center rounded-full bg-primary/10 px-4 text-primary/80 text-sm"
    >
      v{process.env.VERSION}
    </div>
  )
}
