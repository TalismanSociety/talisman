import { yupResolver } from "@hookform/resolvers/yup"
import { KeyIcon } from "@talisman/theme/icons"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useSensitiveState } from "@ui/hooks/useSensitiveState"
import { FC, ReactNode, useCallback, useEffect } from "react"
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

type MnemonicUnlockContext = {
  unlock: (password: string) => Promise<void>
  mnemonic?: string
}

function useMnemonicUnlockContext({ mnemonicId }: { mnemonicId: string }): MnemonicUnlockContext {
  const [mnemonic, setMnemonic] = useSensitiveState<string>()

  const unlock = useCallback(
    async (password: string) => {
      const secret = await api.mnemonicUnlock(mnemonicId, password)
      setMnemonic(secret)
    },
    [mnemonicId, setMnemonic]
  )

  return {
    unlock,
    mnemonic,
  }
}

const [MnemonicUnlockProvider, useMnemonicUnlock] = provideContext(useMnemonicUnlockContext)

export { useMnemonicUnlock }

type MnemonicUnlockProps = {
  className?: string
  children: ReactNode
  buttonText?: string
  title?: ReactNode
}

const BaseMnemonicUnlock: FC<MnemonicUnlockProps> = ({
  className,
  children,
  buttonText,
  title,
}) => {
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

  const { unlock, mnemonic } = useMnemonicUnlock()

  const submit = useCallback(
    async ({ password }: FormData) => {
      try {
        await unlock(password)
      } catch (err) {
        setError("password", {
          message: (err as Error)?.message ?? "",
        })
      }
    },
    [unlock, setError]
  )

  useEffect(() => {
    if (!mnemonic) setFocus("password")
  }, [mnemonic, setFocus])

  useEffect(() => {
    return () => {
      setValue("password", "")
    }
  }, [setValue])

  return mnemonic ? (
    <>{children}</>
  ) : (
    <form onSubmit={handleSubmit(submit)} className={className}>
      <FormFieldContainer label={title} error={errors.password?.message}>
        <FormFieldInputText
          before={<KeyIcon className="h-10 w-10 opacity-50" />}
          {...register("password")}
          type="password"
          placeholder={t("Enter password")}
          spellCheck={false}
          data-lpignore
        />
      </FormFieldContainer>
      <Button type="submit" fullWidth primary disabled={!isValid} processing={isSubmitting}>
        {buttonText || t("Unlock")}
      </Button>
    </form>
  )
}

export const MnemonicUnlock: FC<MnemonicUnlockProps & { mnemonicId: string }> = ({
  children,
  mnemonicId,
  ...props
}) => {
  return (
    <MnemonicUnlockProvider mnemonicId={mnemonicId}>
      <BaseMnemonicUnlock {...props}>{children}</BaseMnemonicUnlock>
    </MnemonicUnlockProvider>
  )
}
