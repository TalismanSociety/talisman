import { yupResolver } from "@hookform/resolvers/yup"
import { FormField } from "@talisman/components/Field/FormField"
import { StatusIcon } from "@talisman/components/StatusIcon"
import { api } from "@ui/api"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useCallback, useEffect, useRef } from "react"
import { SubmitHandler, useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { Button } from "talisman-ui"
import * as yup from "yup"

import Layout, { Content, Footer } from "../Layout"

type FormData = {
  password: string
}

const schema = yup
  .object({
    password: yup.string().required(""),
  })
  .required()

export const Login = () => {
  const { popupOpenEvent } = useAnalytics()
  const navigate = useNavigate()

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

  return (
    <Layout className="pt-32">
      <Content className="text-center">
        <StatusIcon status={isSubmitting ? "SPINNING" : "STATIC"} />
        <h1 className="mt-2 font-sans text-[3.2rem]">Unlock Talisman</h1>
        {errors.password?.message && (
          <div className="text-alert-warn">{errors.password?.message}</div>
        )}
      </Content>
      <Footer>
        <form className="flex flex-col items-center gap-6" onSubmit={handleSubmit(submit)}>
          <FormField className="w-full text-center">
            <input
              {...register("password")}
              type="password"
              placeholder="Enter password"
              spellCheck={false}
              autoComplete="off"
              data-lpignore
              autoFocus
            />
          </FormField>
          <Button type="submit" fullWidth primary disabled={!isValid} processing={isSubmitting}>
            Unlock
          </Button>
          <span
            className="text-body-secondary mt-2 cursor-pointer text-sm hover:text-white"
            onClick={() => navigate("/reset-wallet")}
          >
            Forgot Password?
          </span>
        </form>
      </Footer>
    </Layout>
  )
}
