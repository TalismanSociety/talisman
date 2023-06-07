import { AccountJsonAny } from "@core/domains/accounts/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { useTalismanOrb } from "@talisman/components/TalismanOrb"
import { HandMonoTransparentLogo } from "@talisman/theme/logos"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { usePrimaryAccount } from "@ui/hooks/usePrimaryAccount"
import { useCallback, useEffect, useRef, useState } from "react"
import { SubmitHandler, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button, FormFieldInputText } from "talisman-ui"
import { LoginBackground } from "talisman-ui"
import * as yup from "yup"

import Layout, { Content, Footer } from "../Layout"
import { ResetWallet } from "./ResetWallet"

type FormData = {
  password: string
}

const schema = yup
  .object({
    password: yup.string().required(""),
  })
  .required()

const INPUT_CONTAINER_PROPS = { className: "bg-white/10" }

const useAccountColors = ({ account }: { account: AccountJsonAny }): [string, string] => {
  const { bgColor1, bgColor2 } = useTalismanOrb(account.address)

  return [bgColor1, bgColor2]
}

const LoginBackgroundWithAccount = ({ account }: { account: AccountJsonAny }) => {
  const accountColors = useAccountColors({ account })

  return (
    <LoginBackground
      width={400}
      height={600}
      colors={accountColors}
      className="absolute left-0 top-0 m-0 block h-full w-full overflow-hidden "
    />
  )
}

const LoginBackgroundDefault = () => (
  <LoginBackground
    width={400}
    height={600}
    colors={["#F48F45", "#C8EB46"]}
    className="absolute left-0 top-0 m-0 block h-full w-full overflow-hidden "
  />
)

const Login = ({ setShowResetWallet }: { setShowResetWallet: () => void }) => {
  const { t } = useTranslation()
  const { popupOpenEvent } = useAnalytics()

  useEffect(() => {
    popupOpenEvent("auth")
  }, [popupOpenEvent])

  const {
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
          if (qs.get("closeOnSuccess") === "true") window.close()
        } else throw new Error(t("Paraverse access denied"))
      } catch (err) {
        setError("password", { message: (err as Error)?.message ?? t("Unknown error") })
        setFocus("password", { shouldSelect: true })
      }
    },
    [setError, setFocus, t]
  )

  // autologin, for developers only
  const refDone = useRef(false)
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && process.env.PASSWORD && !refDone.current) {
      refDone.current = true // prevent infinite loop if password is incorrect
      setValue("password", process.env.PASSWORD)
      handleSubmit(submit)()
    }
  }, [handleSubmit, setValue, submit])

  const primaryAccount = usePrimaryAccount()

  return (
    <Layout className="pt-32">
      {!!primaryAccount && <LoginBackgroundWithAccount account={primaryAccount} />}
      {!primaryAccount && <LoginBackgroundDefault />}
      <Content className={classNames("z-10 text-center", isSubmitting && "animate-pulse")}>
        <div className="mt-[60px]">
          <HandMonoTransparentLogo className="inline-block text-[64px]" />
        </div>
        <h1 className="font-surtExpanded mt-[34px] text-lg">{t("Unlock the Talisman")}</h1>
        {errors.password?.message && (
          <div className="text-alert-warn mt-8">{errors.password?.message}</div>
        )}
      </Content>
      <Footer className="z-10">
        <form className="flex flex-col items-center gap-6" onSubmit={handleSubmit(submit)}>
          <FormFieldInputText
            {...register("password")}
            type="password"
            placeholder={t("Enter password")}
            spellCheck={false}
            autoComplete="off"
            data-lpignore
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            containerProps={INPUT_CONTAINER_PROPS}
            className="placeholder:text-grey-500"
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
            className="text-body-disabled mt-2 cursor-pointer text-sm transition-colors hover:text-white"
            onClick={setShowResetWallet}
          >
            {t("Forgot Password?")}
          </button>
        </form>
      </Footer>
    </Layout>
  )
}

export const LoginViewManager = () => {
  const [showResetWallet, setShowResetWallet] = useState(false)

  if (showResetWallet) return <ResetWallet closeResetWallet={() => setShowResetWallet(false)} />
  return <Login setShowResetWallet={() => setShowResetWallet(true)} />
}
