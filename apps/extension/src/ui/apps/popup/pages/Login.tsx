import styled from "styled-components"
import Layout, { Header, Content, Footer } from "../Layout"
import StatusIcon from "@talisman/components/StatusIcon"
import * as yup from "yup"
import { useCallback, useEffect } from "react"
import { api } from "@ui/api"
import { yupResolver } from "@hookform/resolvers/yup"
import { useForm } from "react-hook-form"
import { FormField } from "@talisman/components/Field/FormField"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { useAnalyticsPopupOpen } from "@ui/hooks/useAnalyticsPopupOpen"

type FormData = {
  password: string
}

const schema = yup
  .object({
    password: yup.string().trim().required(""),
  })
  .required()

const Unlock = ({ className }: any) => {
  useAnalyticsPopupOpen("auth")

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const submit = useCallback(
    async ({ password }: FormData) => {
      try {
        if (await api.authenticate(password)) {
          const qs = new URLSearchParams(window.location.search)
          if (qs.get("closeOnSuccess") === "true") window.close()
        }
        throw new Error("Paraverse access denied")
      } catch (err) {
        setError("password", {
          message: (err as Error)?.message ?? "",
        })
      }
    },
    [setError]
  )

  // autologin, for developers only
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && process.env.PASSWORD)
      submit({ password: process.env.PASSWORD })
  }, [submit])

  return (
    <Layout className={className} isThinking={isSubmitting}>
      <Header />
      <Content>
        <StatusIcon
          status={isSubmitting ? "SPINNING" : "STATIC"}
          title={`Unlock the Talisman`}
          subtitle={
            isSubmitting ? (
              "Unlocking the paraverse"
            ) : errors.password?.message ? (
              <span className="error">{errors.password?.message}</span>
            ) : (
              "Explore the paraverse"
            )
          }
        />
      </Content>
      <Footer>
        <form onSubmit={handleSubmit(submit)}>
          <FormField>
            <input
              {...register("password")}
              type="password"
              placeholder="Enter your password"
              spellCheck={false}
              data-lpignore
              autoFocus
            />
          </FormField>
          <SimpleButton type="submit" primary disabled={!isValid} processing={isSubmitting}>
            Unlock
          </SimpleButton>
        </form>
      </Footer>
    </Layout>
  )
}

const StyledUnlock = styled(Unlock)`
  .error {
    color: var(--color-status-warning);
  }

  .layout-header svg {
    visibility: hidden;
  }

  .layout-footer {
    .field {
      text-align: center;
    }
    ${SimpleButton} {
      width: 100%;
      margin-top: 1em;
    }
  }
`

export default StyledUnlock
