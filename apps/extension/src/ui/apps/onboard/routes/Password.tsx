import { yupResolver } from "@hookform/resolvers/yup"
import { Box } from "@talisman/components/Box"
import { PasswordStrength } from "@talisman/components/PasswordStrength"
import { MouseEventHandler, useCallback } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"
import * as yup from "yup"

import { OnboardButton } from "../components/OnboardButton"
import { OnboardCheckbox } from "../components/OnboardCheckbox"
import { OnboardDialog } from "../components/OnboardDialog"
import { OnboardFormField } from "../components/OnboardFormField"
import { useOnboard } from "../context"
import { Layout } from "../layout"

const Container = styled(Layout)`
  /* background: rgb(131, 58, 180);
  background: linear-gradient(
    20deg,
    var(--color-background) 0%,
    rgba(186, 132, 255, 0.3) 50%,
    rgba(244, 143, 69, 0.3) 100%
  ); */
`

const A = styled.a`
  color: var(--color-foreground);
`

type FormData = {
  password?: string
  passwordConfirm?: string
  agreeToS?: boolean
}

const noPropagation: MouseEventHandler = (e) => e.stopPropagation()

const schema = yup
  .object({
    password: yup.string().required(""),
    passwordConfirm: yup
      .string()
      .trim()
      .oneOf([yup.ref("password")], "Passwords must match"),
    agreeToS: yup.boolean().oneOf([true], ""),
  })
  .required()

export const PasswordPage = () => {
  const { data, updateData } = useOnboard()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues: data,
    resolver: yupResolver(schema),
  })
  const password = watch("password")

  const submit = useCallback(
    async (fields: FormData) => {
      updateData(fields)
      navigate(`/privacy`)
    },
    [navigate, updateData]
  )

  return (
    <Container withBack>
      <Box flex justify="center">
        <Box w={60}>
          <OnboardDialog title="Choose a password">
            <p>
              Your password is used to unlock your wallet and is stored securely on your device. We
              recommend 12 characters, with uppercase and lowercase letters, symbols and numbers.
            </p>
            <form onSubmit={handleSubmit(submit)}>
              <Box flex column>
                <Box fontsize="small" margin="3.2rem 0 1.6rem 0">
                  Password strength: <PasswordStrength password={password} />
                </Box>
                <Box>
                  <OnboardFormField error={errors.password}>
                    <input
                      {...register("password")}
                      type="password"
                      placeholder="Enter password"
                      autoComplete="new-password"
                      spellCheck={false}
                      data-lpignore
                      autoFocus
                    />
                  </OnboardFormField>
                </Box>
                <Box margin="-0.8rem 0 0 0">
                  <OnboardFormField error={errors.passwordConfirm}>
                    <input
                      {...register("passwordConfirm")}
                      type="password"
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      spellCheck={false}
                      data-lpignore
                    />
                  </OnboardFormField>
                </Box>
              </Box>
              <Box margin="0.8rem 0 2.4rem">
                <OnboardCheckbox {...register("agreeToS")}>
                  I agree to the{" "}
                  <A
                    href="https://docs.talisman.xyz/legal-and-security/terms-of-use"
                    target="_blank"
                    rel="noreferrer"
                    onClick={noPropagation}
                  >
                    Terms of Service
                  </A>{" "}
                  and{" "}
                  <A
                    href="https://docs.talisman.xyz/talisman/legal-and-security/privacy-policy"
                    target="_blank"
                    rel="noreferrer"
                    onClick={noPropagation}
                  >
                    Privacy Policy
                  </A>
                </OnboardCheckbox>
              </Box>
              <OnboardButton type="submit" primary disabled={!isValid}>
                Continue
              </OnboardButton>
            </form>
          </OnboardDialog>
        </Box>
      </Box>
    </Container>
  )
}
