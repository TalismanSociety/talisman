import { yupResolver } from "@hookform/resolvers/yup"
import { FormField } from "@talisman/components/Field/FormField"
import { SimpleButton } from "@talisman/components/SimpleButton"
import StatusIcon from "@talisman/components/StatusIcon"
import { api } from "@ui/api"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useCallback, useEffect } from "react"
import { SubmitHandler, useForm } from "react-hook-form"
import styled from "styled-components"
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

  useEffect(() => {
    popupOpenEvent("auth")
  }, [popupOpenEvent])

  const {
    register,
    handleSubmit,
    setError,
    setValue,
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
        setError("password", {
          message: (err as Error)?.message ?? "",
        })
      }
    },
    [setError]
  )

  // autologin, for developers only
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && process.env.PASSWORD && !isSubmitting) {
      setValue("password", process.env.PASSWORD)
      handleSubmit(submit)()
    }
  }, [handleSubmit, isSubmitting, setValue, submit])

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
              autoComplete="off"
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

  .layout-content .children > section {
    margin-top: 50px;
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
