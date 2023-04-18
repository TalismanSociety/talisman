import { yupResolver } from "@hookform/resolvers/yup"
import { useTalismanOrb } from "@talisman/components/TalismanOrb"
import { HandMonoTransparentLogo } from "@talisman/theme/logos"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import useAccountAddresses from "@ui/hooks/useAccountAddresses"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useCallback, useEffect, useRef, useState } from "react"
import { SubmitHandler, useForm } from "react-hook-form"
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

const useAccountColors = (): [string, string] | undefined => {
  const [rootAccount] = useAccountAddresses()
  const { bgColor1, bgColor2 } = useTalismanOrb(rootAccount)

  return rootAccount ? [bgColor1, bgColor2] : undefined
}

const Login = ({ setShowResetWallet }: { setShowResetWallet: () => void }) => {
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
        } else throw new Error("Paraverse access denied")
      } catch (err) {
        setError("password", { message: (err as Error)?.message ?? "Unknown error" })
        setFocus("password", { shouldSelect: true })
      }
    },
    [setError, setFocus]
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

  const accountColors = useAccountColors()

  return (
    <Layout className="pt-32">
      {!!accountColors && (
        <LoginBackground
          width={400}
          height={600}
          colors={accountColors}
          className="absolute left-0 top-0 m-0 block h-full w-full overflow-hidden "
        />
      )}
      <Content className={classNames("z-10 text-center", isSubmitting && "animate-pulse")}>
        <div className="mt-[60px]">
          <HandMonoTransparentLogo className="inline-block text-[64px]" />
        </div>
        <h1 className="font-surtExpanded mt-[34px] text-lg">Unlock the Talisman</h1>
        {errors.password?.message && (
          <div className="text-alert-warn mt-8">{errors.password?.message}</div>
        )}
      </Content>
      <Footer className="z-10">
        <form className="flex flex-col items-center gap-6" onSubmit={handleSubmit(submit)}>
          <FormFieldInputText
            {...register("password")}
            type="password"
            placeholder="Enter password"
            spellCheck={false}
            autoComplete="off"
            data-lpignore
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
            Unlock
          </Button>
          <button
            className="text-body-disabled mt-2 cursor-pointer text-sm transition-colors hover:text-white"
            onClick={setShowResetWallet}
          >
            Forgot Password?
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
