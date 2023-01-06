import { yupResolver } from "@hookform/resolvers/yup"
import { FormField } from "@talisman/components/Field/FormField"
import Spacer from "@talisman/components/Spacer"
import { KeyIcon } from "@talisman/theme/icons"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { ReactNode, useCallback, useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "talisman-ui"
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
  description?: ReactNode
  buttonText?: string
  title?: string
}

type PasswordUnlockContext = {
  checkPassword: (password: string) => Promise<void>
  password?: string
}

export type UsePasswordUnlockChildProps<C extends Record<string, any>> = C & {
  password: string
}

function usePasswordUnlockContext(): PasswordUnlockContext {
  const [password, setPassword] = useState<string>()

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

const BasePasswordUnlock = ({
  className,
  children,
  description,
  buttonText,
  title = "Enter your password",
}: PasswordUnlockProps) => {
  const {
    register,
    handleSubmit,
    setError,
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

  return password ? (
    <>{children}</>
  ) : (
    <div className={className}>
      <form onSubmit={handleSubmit(submit)}>
        {description}
        <div className="font-bold">{title}</div>
        <Spacer small />
        <FormField error={errors.password} prefix={<KeyIcon className="opacity-50" />}>
          <input
            {...register("password")}
            type="password"
            placeholder="Enter password"
            spellCheck={false}
            data-lpignore
            autoFocus
          />
        </FormField>
        <Spacer />
        <Button type="submit" fullWidth primary disabled={!isValid} processing={isSubmitting}>
          {buttonText || "Submit"}
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
