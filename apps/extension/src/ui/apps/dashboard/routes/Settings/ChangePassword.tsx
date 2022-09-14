import { AccountAddressType } from "@core/domains/accounts/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { FormField } from "@talisman/components/Field/FormField"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { useNotification } from "@talisman/components/Notification"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { ArrowRightIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import { api } from "@ui/api"
import Layout from "@ui/apps/dashboard/layout"
import { AccountTypeSelector } from "@ui/domains/Account/AccountTypeSelector"
import useAccounts from "@ui/hooks/useAccounts"
import { useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"
import * as yup from "yup"

const Container = styled(Layout)`
  form {
    padding-top: 1.6rem;
    .field {
      margin-bottom: 2.8rem;
    }
    .buttons {
      display: flex;
      justify-content: end;
    }
  }
`
const InfoP = styled.p`
  color: var(--color-mid);
  margin: 2rem 0;
`

type FormData = {
  currentPw: string
  newPw: string
  newPwConfirm: string
}

const ChangePassword = () => {
  const navigate = useNavigate()
  const notification = useNotification()

  const schema = yup
    .object({
      currentPw: yup.string().required(""),
      newPw: yup.string().required("").min(6, "Password must be at least 6 characters long"),
      newPwConfirm: yup
        .string()
        .required("")
        .oneOf([yup.ref("newPw")], "Passwords must match!"),
    })
    .required()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    setError,
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const submit = useCallback(
    async ({ currentPw, newPw, newPwConfirm }: FormData) => {
      try {
        await api.changePassword(currentPw, newPw, newPwConfirm)
        notification.success({
          title: "Password changed",
        })
        navigate("/portfolio")
      } catch (err) {
        if ((err as Error).message === "Incorrect password")
          setError("currentPw", { message: (err as Error).message })
        if ((err as Error).message === "New password and new password confirmation must match")
          setError("newPwConfirm", { message: (err as Error).message })
        else {
          notification.error({
            title: "Error changing password",
            subtitle: (err as Error)?.message ?? "",
          })
        }
      }
    },
    [navigate, notification, setError]
  )

  return (
    <Container withBack centered>
      <HeaderBlock title="Change your password" />
      <InfoP>
        Your password is used to unlock your wallet and is stored securely on your device. We
        recommend 12 characters, with uppercase and lowercase letters, symbols and numbers.
      </InfoP>
      <form onSubmit={handleSubmit(submit)}>
        <FormField error={errors.currentPw} label="Old Password">
          <input
            {...register("currentPw")}
            placeholder="Enter Old Password"
            spellCheck={false}
            autoComplete="off"
            autoFocus
            data-lpignore
            type="password"
            tabIndex={1}
          />
        </FormField>
        <FormField error={errors.newPw} label="New Password">
          <input
            {...register("newPw")}
            placeholder="Enter New Password"
            spellCheck={false}
            autoComplete="off"
            data-lpignore
            type="password"
            tabIndex={2}
          />
        </FormField>
        <FormField error={errors.newPwConfirm}>
          <input
            {...register("newPwConfirm")}
            placeholder="Confirm New Password"
            spellCheck={false}
            autoComplete="off"
            data-lpignore
            type="password"
            tabIndex={3}
          />
        </FormField>
        <div className="buttons">
          <SimpleButton type="submit" primary disabled={!isValid} processing={isSubmitting}>
            Submit
          </SimpleButton>
        </div>
      </form>
    </Container>
  )
}

export default ChangePassword
