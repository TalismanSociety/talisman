import { yupResolver } from "@hookform/resolvers/yup"
import { FormField } from "@talisman/components/Field/FormField"
import StatusIcon from "@talisman/components/StatusIcon"
import { api } from "@ui/api"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useCallback, useEffect, useRef } from "react"
import { SubmitHandler, useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"
import { Button } from "talisman-ui"
import * as yup from "yup"

import Layout, { Content, Footer, Header } from "../Layout"

type FormData = {
  password: string
}

const schema = yup
  .object({
    password: yup.string().required(""),
  })
  .required()

const Unlock = ({ className }: any) => {
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
        if (await api.authenticate(password)) {
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
    <Layout className={className} isThinking={isSubmitting}>
      <Header />
      <Content>
        <StatusIcon
          status={isSubmitting ? "SPINNING" : "STATIC"}
          title={`Unlock Talisman`}
          subtitle={
            isSubmitting ? (
              "Unlocking the paraverse"
            ) : errors.password?.message ? (
              <span className="error">{errors.password?.message}</span>
            ) : (
              ""
            )
          }
        />
      </Content>
      <Footer>
        <form className="flex flex-col items-center gap-6" onSubmit={handleSubmit(submit)}>
          <FormField className="w-full">
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
            className="text-body-secondary mt-2 text-sm hover:text-white"
            onClick={() => navigate("/reset-wallet")}
          >
            Forgot Password?
          </span>
        </form>
      </Footer>
    </Layout>
  )
}

export const Login = styled(Unlock)`
  .error {
    color: var(--color-status-warning);
  }

  .layout-header svg {
    visibility: hidden;
  }
`
