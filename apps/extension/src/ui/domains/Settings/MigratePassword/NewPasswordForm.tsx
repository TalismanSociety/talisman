import { yupResolver } from "@hookform/resolvers/yup"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { PasswordStrength } from "@talisman/components/PasswordStrength"
import { useCallback } from "react"
import { useForm } from "react-hook-form"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

import { useMigratePassword } from "./context"

type FormData = {
  newPw: string
  newPwConfirm: string
}

const schema = yup
  .object({
    newPw: yup.string().required("").min(6, "Password must be at least 6 characters long"),
    newPwConfirm: yup
      .string()
      .required("")
      .oneOf([yup.ref("newPw")], "Passwords must match!"),
  })
  .required()

export const NewPasswordForm = () => {
  const { setNewPassword } = useMigratePassword()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
    watch,
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const newPwWatch = watch("newPw")

  const submit = useCallback(({ newPw }: FormData) => setNewPassword(newPw), [setNewPassword])

  return (
    <ModalDialog title="Enter new password">
      <p className="text-body-secondary mb-16 text-sm">
        Your password is used to unlock your wallet and is stored securely on your device. We
        recommend 12 characters, with uppercase and lowercase letters, symbols and numbers.
      </p>

      <form onSubmit={handleSubmit(submit)}>
        <div className="text-body-disabled mb-12 text-sm">
          Password strength: <PasswordStrength password={newPwWatch} />
        </div>
        <FormFieldContainer error={errors.newPw?.message} className="mb-12">
          <FormFieldInputText
            {...register("newPw")}
            placeholder="Enter New Password"
            spellCheck={false}
            autoComplete="new-password"
            data-lpignore
            type="password"
            tabIndex={0}
          />
        </FormFieldContainer>
        <FormFieldContainer error={errors.newPwConfirm?.message} className="mb-12">
          <FormFieldInputText
            {...register("newPwConfirm")}
            placeholder="Confirm New Password"
            spellCheck={false}
            autoComplete="off"
            data-lpignore
            type="password"
            tabIndex={0}
          />
        </FormFieldContainer>
        <Button
          className="mt-12"
          type="submit"
          primary
          fullWidth
          disabled={!isValid}
          processing={isSubmitting}
        >
          Continue
        </Button>
      </form>
    </ModalDialog>
  )
}
