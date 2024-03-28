import { yupResolver } from "@hookform/resolvers/yup"
import { CapsLockWarningIcon } from "@talisman/components/CapsLockWarningIcon"
import { provideContext } from "@talisman/util/provideContext"
import { KeyIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { useSensitiveState } from "@ui/hooks/useSensitiveState"
import { ReactNode, useCallback, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

type FormData = {
  password: string
}

const schema = yup
  .object({
    password: yup.string().required(""),
  })
  .required()

type PasswordUnlockProps = {
  className?: string
  children: ReactNode
  buttonText?: string
  title?: ReactNode
}

type PasswordUnlockContext = {
  checkPassword: (password: string) => Promise<void>
  password?: string
}

function usePasswordUnlockContext(): PasswordUnlockContext {
  const [password, setPassword] = useSensitiveState<string>()

  const checkPassword = useCallback(
    async (password: string) => {
      if (await api.checkPassword(password)) setPassword(password)
    },
    [setPassword]
  )

  return {
    checkPassword,
    password,
  }
}

const [PasswordUnlockProvider, usePasswordUnlock] = provideContext(usePasswordUnlockContext)

export { usePasswordUnlock }

const BasePasswordUnlock = ({ className, children, buttonText, title }: PasswordUnlockProps) => {
  const { t } = useTranslation()
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

  const { checkPassword, password } = usePasswordUnlock()

  const submit = useCallback(
    async ({ password }: FormData) => {
      try {
        await checkPassword(password)
      } catch (err) {
        setError("password", {
          message: (err as Error)?.message ?? "",
        })
      }
    },
    [checkPassword, setError]
  )

  useEffect(() => {
    if (!password) setFocus("password")
  }, [password, setFocus])

  useEffect(() => {
    return () => {
      setValue("password", "")
    }
  }, [setValue])

  return password ? (
    <div className={className}>{children}</div>
  ) : (
    <div className={className}>
      <form onSubmit={handleSubmit(submit)} className="flex h-full flex-col">
        <div className="flex grow flex-col justify-center">
          <div className="text-md mb-6">{title || t("Enter your password")}</div>
          <FormFieldContainer error={errors.password?.message}>
            <FormFieldInputText
              before={<KeyIcon className="opacity-50" />}
              {...register("password")}
              type="password"
              placeholder={t("Enter password")}
              spellCheck={false}
              data-lpignore
              after={<CapsLockWarningIcon />}
            />
          </FormFieldContainer>
        </div>
        <Button type="submit" fullWidth primary disabled={!isValid} processing={isSubmitting}>
          {buttonText || t("Submit")}
        </Button>
      </form>
    </div>
  )
}

export const PasswordUnlock = ({ children, ...props }: PasswordUnlockProps) => {
  return (
    <PasswordUnlockProvider>
      <BasePasswordUnlock {...props}>{children}</BasePasswordUnlock>
    </PasswordUnlockProvider>
  )
}
