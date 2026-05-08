import { yupResolver } from "@hookform/resolvers/yup"
import { KeyIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { CapsLockWarningIcon } from "@ui/components/CapsLockWarningIcon"
import { Drawer } from "@ui/components/Drawer"
import { FormFieldContainer } from "@ui/components/FormFieldContainer"
import { FormFieldInputText } from "@ui/components/FormFieldInputText"
import { notify } from "@ui/components/Notifications"
import { useOpenCloseStatus } from "@ui/hooks/useOpenCloseStatus"
import { type FC, useCallback, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import * as yup from "yup"

type FormData = {
  password: string
}

const schema = yup
  .object({
    password: yup.string().required(" "),
  })
  .required()

type PasswordCheckDrawerProps = {
  isOpen: boolean
  containerId?: string
  onVerified: () => void
  onDismiss: () => void
}

const PasswordCheckDrawerContent: FC<
  Pick<PasswordCheckDrawerProps, "onVerified" | "onDismiss">
> = ({ onVerified, onDismiss }) => {
  const { t } = useTranslation()
  const isOpenRef = useRef(true)

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const status = useOpenCloseStatus()
  useEffect(() => {
    if (status === "open") setFocus("password")
  }, [setFocus, status])

  // Track open state so in-flight checks can be cancelled on dismiss
  useEffect(() => {
    isOpenRef.current = true
    return () => {
      isOpenRef.current = false
    }
  }, [])

  // Clear password on unmount
  useEffect(() => {
    return () => {
      reset({ password: "" })
    }
  }, [reset])

  const submit = useCallback(
    async ({ password }: FormData) => {
      try {
        const valid = await api.checkPassword(password)
        if (!isOpenRef.current) return

        if (valid) {
          reset({ password: "" })
          onVerified()
        } else {
          notify({
            type: "error",
            title: t("Incorrect password"),
          })
        }
      } catch (err) {
        if (!isOpenRef.current) return
        notify({
          type: "error",
          title: t("Password check failed"),
          subtitle: (err as Error)?.message?.slice(0, 200) ?? t("Unknown error"),
        })
      }
    },
    [onVerified, reset, t]
  )

  return (
    <div className="flex w-full flex-col gap-8 rounded-t-xl bg-grey-800 p-12">
      <div className="text-md">{t("Enter your password to confirm")}</div>
      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-8">
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
        <div className="grid grid-cols-2 gap-8">
          <Button type="button" onClick={onDismiss} disabled={isSubmitting}>
            {t("Cancel")}
          </Button>
          <Button type="submit" primary disabled={!isValid} processing={isSubmitting}>
            {t("Confirm")}
          </Button>
        </div>
      </form>
    </div>
  )
}

export const PasswordCheckDrawer: FC<PasswordCheckDrawerProps> = ({
  isOpen,
  containerId,
  onVerified,
  onDismiss,
}) => {
  return (
    <Drawer anchor="bottom" isOpen={isOpen} containerId={containerId} onDismiss={onDismiss}>
      <PasswordCheckDrawerContent onVerified={onVerified} onDismiss={onDismiss} />
    </Drawer>
  )
}
