import { useCallback, useState } from "react"
import styled from "styled-components"
import { useOnboard } from "../context"
import { Layout } from "../layout"
import imgAgyle from "@talisman/theme/images/onboard_agyle.png"
import { ArrowRightIcon } from "@talisman/theme/icons"
import * as yup from "yup"
import { yupResolver } from "@hookform/resolvers/yup"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { FormField } from "@talisman/components/Field/FormField"
import { PasswordStrength } from "@talisman/components/PasswordStrength"

const Image = styled.img`
  // force size to avoid page layout shift on load
  height: 63.249rem;
  width: 43.2rem;

  @media (max-width: 1146px) {
    height: calc(0.75 * 63.249rem);
    width: calc(0.75 * 43.2rem);
  }
`

const Error = styled.div`
  font-size: var(--font-size-small);
  height: 1em;
  color: var(--color-status-warning);
`

const BtnNext = styled(SimpleButton)`
  width: 24rem;
  margin-top: 0.8rem;
`

const Form = styled.form`
  margin-top: 1.6rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1.6rem;
`

const PasswordFieldContainer = styled(FormField)`
  &&& {
    .suffix {
      opacity: 1;
    }
  }
`

type FormData = {
  password?: string
  passwordConfirm?: string
}

const schema = yup
  .object({
    password: yup.string().trim().required(""),
    passwordConfirm: yup
      .string()
      .trim()
      .oneOf([yup.ref("password")], "Passwords must match"),
  })
  .required()

export const EnterPass = () => {
  const navigate = useNavigate()
  const { data: defaultValues, createAccount } = useOnboard()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues,
    resolver: yupResolver(schema),
  })
  const password = watch("password")

  const [error, setError] = useState<string>()
  const submit = useCallback(
    async (fields: FormData) => {
      try {
        const { password, passwordConfirm } = fields
        await createAccount(password as string, passwordConfirm as string)
        navigate("/analytics")
      } catch (err) {
        setError(`Failed to create the account : ${(err as Error)?.message ?? ""}`)
      }
    },
    [createAccount, navigate]
  )

  return (
    <Layout withBack picture={<Image src={imgAgyle} alt="Agyle" />}>
      <h1>Lastly, let's set a password for your Talisman.</h1>
      <p>
        This will be used to protect your accounts and your funds.
        <br />
        Please make sure you don't share it with anybody.
      </p>
      <Form onSubmit={handleSubmit(submit)}>
        <PasswordFieldContainer
          error={errors.password}
          suffix={<PasswordStrength password={password} />}
        >
          <input
            {...register("password")}
            type="password"
            placeholder="Enter password"
            autoComplete="new-password"
            spellCheck={false}
            data-lpignore
            autoFocus
          />
        </PasswordFieldContainer>
        <FormField error={errors.passwordConfirm}>
          <input
            {...register("passwordConfirm")}
            type="password"
            placeholder="Re-enter password"
            autoComplete="new-password"
            spellCheck={false}
            data-lpignore
          />
        </FormField>
        <div>
          <BtnNext type="submit" primary disabled={!isValid} processing={isSubmitting}>
            Let's do this <ArrowRightIcon />
          </BtnNext>
          <Error>{error}</Error>
        </div>
      </Form>
    </Layout>
  )
}
