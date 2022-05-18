import HeaderBlock from "@talisman/components/HeaderBlock"
import Spacer from "@talisman/components/Spacer"
import { useNavigate } from "react-router-dom"
import { useNotification } from "@talisman/components/Notification"
import Layout from "../layout"
import * as yup from "yup"
import { useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import { api } from "@ui/api"
import { FormField } from "@talisman/components/Field/FormField"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { ArrowRightIcon } from "@talisman/theme/icons"
import useAccounts from "@ui/hooks/useAccounts"

type FormData = {
  name: string
}

const AccountNew = () => {
  const navigate = useNavigate()
  const notification = useNotification()
  const allAccounts = useAccounts()
  const accountNames = useMemo(() => allAccounts.map((a) => a.name), [allAccounts])

  const schema = useMemo(
    () =>
      yup
        .object({
          name: yup.string().required("").notOneOf(accountNames, "Name already in use"),
        })
        .required(),
    [accountNames]
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const submit = useCallback(
    async ({ name }: FormData) => {
      notification.processing({
        title: "Creating account",
        subtitle: "Please wait",
        timeout: null,
      })

      try {
        await api.accountCreate(name)
        notification.success({
          title: "Account created",
          subtitle: name,
        })
        navigate("/accounts")
      } catch (err) {
        notification.error({
          title: "Error creating account",
          subtitle: (err as Error)?.message ?? "",
        })
      }
    },
    [navigate, notification]
  )

  return (
    <Layout withBack centered>
      <HeaderBlock
        title="Create a new account"
        text="Choose a name for your account. You can always change this later."
      />
      <Spacer />
      <form data-button-pull-left onSubmit={handleSubmit(submit)}>
        <FormField error={errors.name}>
          <input
            {...register("name")}
            placeholder="Choose a name"
            spellCheck={false}
            autoComplete="off"
            autoFocus
            data-lpignore
          />
        </FormField>
        <Spacer />
        <SimpleButton type="submit" primary disabled={!isValid} processing={isSubmitting}>
          Create <ArrowRightIcon />
        </SimpleButton>
      </form>
    </Layout>
  )
}

export default AccountNew
