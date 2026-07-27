import { log } from "@common/log"
import { yupResolver } from "@hookform/resolvers/yup"
import { EyeIcon, EyeOffIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { LoginBackground } from "@ui/apps/popup/components/LoginBackground"
import { Button } from "@ui/components/Button"
import { CapsLockWarningIcon } from "@ui/components/CapsLockWarningIcon"
import { FormFieldInputText } from "@ui/components/FormFieldInputText"
import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useFirstAccountColors } from "@ui/hooks/useFirstAccountColors"
import { useQuickUnlockErrorMessage } from "@ui/hooks/useQuickUnlockErrorMessage"
import { useIsQuickUnlockEnrolled } from "@ui/state/quickUnlock"
import { useSetting } from "@ui/state/settings"
import { HandMonoLogo } from "@ui/theme/logos"
import { cn } from "@ui/util/cn"
import { getQuickUnlockPrfOutput, signalCredentialRemoved } from "@ui/util/webauthnPrf"
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

/** autologin (below) drives the password field itself, it must not race the quick unlock prompt */
const IS_DEV_AUTOLOGIN = process.env.NODE_ENV !== "production" && !!process.env.PASSWORD

const QuickUnlockButton = ({
  autoTrigger,
  onError,
}: {
  autoTrigger: boolean
  onError: (error?: string) => void
}) => {
  const { t } = useTranslation()
  const enrolled = useIsQuickUnlockEnrolled()
  const [processing, setProcessing] = useState(false)
  const getErrorMessage = useQuickUnlockErrorMessage()
  const triggeredRef = useRef(false)
  const abortRef = useRef<AbortController>(null)

  useEffect(() => {
    // abandon any ceremony still waiting on the user. pagehide covers the popup being torn down,
    // where react never gets to run the unmount cleanup
    const abort = () => abortRef.current?.abort()
    window.addEventListener("pagehide", abort)
    return () => {
      window.removeEventListener("pagehide", abort)
      abort()
    }
  }, [])

  const handleQuickUnlock = useCallback(
    async (explicit: boolean) => {
      if (processing) return
      setProcessing(true)
      onError(undefined)
      abortRef.current?.abort()
      const abort = new AbortController()
      abortRef.current = abort
      try {
        const credentialInfo = await api.quickUnlockGetCredentialInfo()
        if (!credentialInfo)
          return onError(t("Quick unlock was reset, please enable it again from settings."))

        const prfOutput = await getQuickUnlockPrfOutput(
          credentialInfo.credentialId,
          credentialInfo.prfSalt,
          abort.signal
        )

        const result = await api.quickUnlockAuthenticate(prfOutput)

        // the passkey outlives the enrollment, only tell the authenticator about it once the
        // background has confirmed the enrollment is gone for good
        if (result === "unenrolled") {
          await signalCredentialRemoved(credentialInfo.credentialId)
          return onError(t("Quick unlock was reset, please enable it again from settings."))
        }

        if (result === "failed")
          return onError(
            t("Quick unlock didn't complete. Use your password, or turn it off in settings.")
          )

        const qs = new URLSearchParams(window.location.search)
        if (qs.get("closeAfterLogin") === "true") window.close()
      } catch (err) {
        const name = (err as DOMException)?.name

        // we abandoned the ceremony ourselves, or the user dismissed a prompt they didn't ask for
        if (name === "AbortError" || (name === "NotAllowedError" && !explicit)) return

        // NotAllowedError also covers a timeout and a credential the authenticator no longer has,
        // the spec doesn't let us tell those apart - point at the way out instead of guessing
        const message =
          name === "NotAllowedError"
            ? t("Quick unlock didn't complete. Use your password, or turn it off in settings.")
            : getErrorMessage(err)
        if (!message) return

        // log the error category only, it must never carry credential or password data
        log.error("Quick unlock failed", { name })
        onError(message)
      } finally {
        setProcessing(false)
      }
    },
    [getErrorMessage, onError, processing, t]
  )

  const handleClick = useCallback(() => handleQuickUnlock(true), [handleQuickUnlock])

  // auto-trigger quick unlock on first render, unless the user is already typing their password
  useEffect(() => {
    if (!autoTrigger || !enrolled || triggeredRef.current) return

    // an unfocused popup is one the browser is tearing down, or one the user has moved on from.
    // prompting there puts an OS dialog (Windows Hello) on screen that nobody asked for, and on
    // windows that dialog outlives the page it was started from.
    //
    // a popup the browser has just opened for us (a dapp request, or a login prompt) often hasn't
    // been given focus yet by the time we get here, so wait for it instead of giving up - a popup
    // on its way out never gets focus back
    const trigger = () => {
      if (triggeredRef.current) return
      if (document.visibilityState !== "visible" || !document.hasFocus()) return

      triggeredRef.current = true
      window.removeEventListener("focus", trigger)
      handleQuickUnlock(false)
    }

    trigger()
    window.addEventListener("focus", trigger)
    return () => window.removeEventListener("focus", trigger)
  }, [autoTrigger, enrolled, handleQuickUnlock])

  if (!enrolled) return null

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={processing}
      className={cn(
        "cursor-pointer text-body-disabled text-sm transition-colors hover:text-white",
        processing && "animate-pulse"
      )}
    >
      {t("Quick unlock")}
    </button>
  )
}

const Login = ({
  setShowResetWallet,
  autoTriggerQuickUnlock,
}: {
  setShowResetWallet: () => void
  autoTriggerQuickUnlock: boolean
}) => {
  const { t } = useTranslation()
  const { popupOpenEvent } = useAnalytics()
  const quickUnlockEnrolled = useIsQuickUnlockEnrolled()
  const [quickUnlockError, setQuickUnlockError] = useState<string>()

  useEffect(() => {
    popupOpenEvent("auth")
  }, [popupOpenEvent])

  const {
    watch,
    register,
    handleSubmit,
    clearErrors,
    setError,
    setValue,
    setFocus,
    formState: { errors, isDirty, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const handleQuickUnlockError = useCallback(
    (error?: string) => {
      clearErrors("password")
      setQuickUnlockError(error)
    },
    [clearErrors]
  )

  const submit = useCallback<SubmitHandler<FormData>>(
    async ({ password }) => {
      setQuickUnlockError(undefined)
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
        {(errors.password?.message ?? quickUnlockError) && (
          <div className="mt-8 text-alert-warn">{errors.password?.message ?? quickUnlockError}</div>
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
          {/* both entry points share a row, so enrolling doesn't move the form up */}
          <div
            className={cn("mt-2 grid w-full", quickUnlockEnrolled ? "grid-cols-2" : "grid-cols-1")}
          >
            <QuickUnlockButton
              autoTrigger={autoTriggerQuickUnlock && !isDirty && !IS_DEV_AUTOLOGIN}
              onError={handleQuickUnlockError}
            />
            <button
              type="button"
              className={cn(
                "cursor-pointer text-body-disabled text-sm transition-colors hover:text-white",
                // the column edge is the separator, so it can't drift off centre
                quickUnlockEnrolled && "border-grey-700 border-l"
              )}
              onClick={setShowResetWallet}
            >
              {t("Forgot Password?")}
            </button>
          </div>
        </form>
      </PopupFooter>
    </PopupLayout>
  )
}

export const LoginViewManager = ({
  autoTriggerQuickUnlock,
}: {
  /** false when the login screen replaced an unlocked session, ie the user didn't come here to unlock */
  autoTriggerQuickUnlock: boolean
}) => {
  const [showResetWallet, setShowResetWallet] = useState(false)

  if (showResetWallet) return <ResetWallet closeResetWallet={() => setShowResetWallet(false)} />
  return (
    <Login
      setShowResetWallet={() => setShowResetWallet(true)}
      autoTriggerQuickUnlock={autoTriggerQuickUnlock}
    />
  )
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
  handleSubmit: UseFormHandleSubmit<FormData, FormData>
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
