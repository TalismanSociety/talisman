import { yupResolver } from "@hookform/resolvers/yup"
import { Box } from "@talisman/components/Box"
import { FormField } from "@talisman/components/Field/FormField"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { notify } from "@talisman/components/Notifications"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { InfoIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import Layout from "@ui/apps/dashboard/layout"
import { MnemonicModal } from "@ui/domains/Settings/MnemonicModal"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useCallback } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"
import * as yup from "yup"

const Button = styled.button`
  border-radius: var(--border-radius-small);
  background-color: var(--color-primary);
  color: black;
  padding: 1.6rem;
  font-size: 1.4rem;
  white-space: nowrap;
  border: none;
  cursor: pointer;
  width: 20rem;
`

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
  .mnemonic-warning svg {
    color: var(--color-primary);
    margin-right: 1rem;
    width: 4em;
    height: 4em;
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
  const { isNotConfirmed } = useMnemonicBackup()
  const { isOpen, open, close } = useOpenClose()

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
        notify({
          type: "success",
          title: "Password changed",
        })
        navigate("/portfolio")
      } catch (err) {
        if ((err as Error).message === "Incorrect password")
          setError("currentPw", { message: (err as Error).message })
        if ((err as Error).message === "New password and new password confirmation must match")
          setError("newPwConfirm", { message: (err as Error).message })
        else {
          notify({
            type: "error",
            title: "Error changing password",
            subtitle: (err as Error)?.message ?? "",
          })
        }
      }
    },
    [navigate, setError]
  )

  return (
    <>
      <Container withBack centered>
        <HeaderBlock title="Change your password" />
        <InfoP>
          Your password is used to unlock your wallet and is stored securely on your device. We
          recommend 12 characters, with uppercase and lowercase letters, symbols, and numbers.
        </InfoP>
        {isNotConfirmed && (
          <Box
            className="mnemonic-warning"
            flex
            column
            padding={1.6}
            gap={1}
            border="1px solid white"
            borderradius="small"
          >
            <Box flex justify={"space-between"} align={"center"}>
              <InfoIcon />
              You'll need to confirm your recovery phrase is backed up before you change your
              password.
            </Box>
            <Box flex justify={"end"}>
              <Button onClick={open}>Backup Seed Phrase</Button>
            </Box>
          </Box>
        )}

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
              disabled={isNotConfirmed}
            />
          </FormField>
          <FormField error={errors.newPw} label="New Password">
            <input
              {...register("newPw")}
              placeholder="Enter New Password"
              spellCheck={false}
              autoComplete="new-password"
              data-lpignore
              type="password"
              tabIndex={2}
              disabled={isNotConfirmed}
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
              disabled={isNotConfirmed}
            />
          </FormField>
          <div className="buttons">
            <SimpleButton
              type="submit"
              primary
              disabled={!isValid || isNotConfirmed}
              processing={isSubmitting}
            >
              Submit
            </SimpleButton>
          </div>
        </form>
      </Container>
      <MnemonicModal open={isOpen} onClose={close} />
    </>
  )
}

export default ChangePassword
