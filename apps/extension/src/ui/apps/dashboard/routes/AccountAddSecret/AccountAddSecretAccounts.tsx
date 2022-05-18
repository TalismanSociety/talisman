import { useNavigate } from "react-router-dom"
import { useNotification } from "@talisman/components/Notification"
import Layout from "../../layout"
import * as yup from "yup"
import { useCallback, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import { SimpleButton } from "@talisman/components/SimpleButton"
import styled from "styled-components"
import { useAccountAddSecret } from "./context"
import Spacer from "@talisman/components/Spacer"
import { RequestAccountCreateFromSeed } from "@core/types"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { DerivedAccountPicker } from "@ui/domains/Account/DerivedAccountPicker"

const Container = styled(Layout)`
  ${SimpleButton} {
    width: 24rem;
  }

  form {
    display: flex;
    flex-direction: column;
    height: 53.4rem;
    max-height: 100vh;

    .grow {
      flex-grow: 1;
    }

    .buttons {
      display: flex;
      justify-content: flex-end;
      margin-top: 2.4rem;
    }
    padding-bottom: 2.4rem;
  }
`

type FormData = {
  accounts: RequestAccountCreateFromSeed[]
}

export const AccountAddSecretAccounts = () => {
  const { data, importAccounts } = useAccountAddSecret()
  const navigate = useNavigate()
  const notification = useNotification()

  const name = useMemo(
    () => (data.type! === "ethereum" ? "Ethereum Account" : "Polkadot Account"),
    [data.type]
  )

  const schema = useMemo(
    () =>
      yup
        .object({
          accounts: yup.array().min(1),
        })
        .required(),
    []
  )

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues: data,
    resolver: yupResolver(schema),
  })

  const submit = useCallback(
    async ({ accounts }: FormData) => {
      const suffix = accounts?.length > 1 ? "s" : ""
      notification.processing({
        title: "Importing account" + suffix,
        subtitle: "Please wait",
        timeout: null,
      })
      try {
        await importAccounts(accounts)

        notification.success({
          title: `Account${suffix} imported`,
          subtitle: null,
        })
        navigate("/")
      } catch (err) {
        notification.error({
          title: "Importing account" + suffix,
          subtitle: (err as Error).message,
        })
      }
    },
    [importAccounts, navigate, notification]
  )

  const handleAccountsChange = useCallback(
    (accounts: RequestAccountCreateFromSeed[]) => {
      setValue("accounts", accounts, { shouldValidate: true })
    },
    [setValue]
  )

  useEffect(() => {
    if (!data.type) return navigate("")
    if (!data.mnemonic) return navigate("mnemonic")
  }, [data.mnemonic, data.type, navigate])

  const accounts = watch("accounts")

  return (
    <Container withBack centered>
      <form data-button-pull-left onSubmit={handleSubmit(submit)}>
        <div className="grow">
          <HeaderBlock
            title={`Import ${data?.type === "ethereum" ? "Ethereum" : "Polkadot"} account(s)`}
            text="Please select which account(s) you'd like to import."
          />
          <Spacer />
          <DerivedAccountPicker
            name={name}
            mnemonic={data.mnemonic!}
            type={data.type!}
            onChange={handleAccountsChange}
          />
        </div>

        <div className="buttons">
          <SimpleButton type="submit" primary disabled={!isValid} processing={isSubmitting}>
            Import {accounts?.length || ""}
          </SimpleButton>
        </div>
        <Spacer />
      </form>
    </Container>
  )
}
