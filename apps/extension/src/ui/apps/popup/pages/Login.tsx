import { yupResolver } from "@hookform/resolvers/yup"
import { EyeIcon, EyeOffIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  SubmitHandler,
  useForm,
  UseFormHandleSubmit,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button, FormFieldInputText, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"
import * as yup from "yup"

import { CapsLockWarningIcon } from "@talisman/components/CapsLockWarningIcon"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { HandMonoLogo } from "@talisman/theme/logos"
import { api } from "@ui/api"
import { LoginBackground } from "@ui/apps/popup/components/LoginBackground"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useFirstAccountColors } from "@ui/hooks/useFirstAccountColors"
import { useSetting } from "@ui/state"

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
          className={classNames(
            "absolute right-10 top-10 z-20",
            "inline-flex cursor-pointer items-center"
          )}
        >
          <input
            id="showBalances"
            type="checkbox"
            className="peer sr-only"
            defaultChecked={!hideBalances}
            onChange={(e) => setHideBalances(!e.target.checked)}
          />
          <div
            className={classNames(
              "bg-grey-600 peer h-14 w-28 shrink-0 rounded-full",
              "peer-focus-visible:ring-body peer-focus:outline-none peer-focus-visible:ring-2"
            )}
          ></div>
          <div
            className={classNames(
              "absolute left-1 top-1 flex h-12 w-12 ",
              "bg-grey-800 rounded-full",
              "peer-checked:bg-primary transition peer-checked:translate-x-14"
            )}
          >
            <EyeIcon
              className={classNames(
                "absolute left-2 top-2 h-8 w-8",
                "text-body-black transition-opacity",
                hideBalances ? "opacity-0" : "opacity-100"
              )}
            />
            <EyeOffIcon
              className={classNames(
                "absolute left-2 top-2 h-8 w-8",
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

  return <LoginBackground className="absolute left-0 top-0 h-full w-full" colors={colors} />
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
      </Suspense>
      <PopupContent
        className={classNames("z-10 pt-32 text-center", isSubmitting && "animate-pulse")}
      >
        <div className="mt-[60px]">
          <HandMonoLogo className="inline-block text-[64px]" />
        </div>
        <h1 className="font-surtExpanded mt-[34px] text-lg">{t("Unlock the Talisman")}</h1>
        {errors.password?.message && (
          <div className="text-alert-warn mt-8">{errors.password?.message}</div>
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
            className={classNames(!isValid && "bg-white/10")}
          >
            {t("Unlock")}
          </Button>
          <button
            type="button"
            className="text-body-disabled mt-2 cursor-pointer text-sm transition-colors hover:text-white"
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
