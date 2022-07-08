import { yupResolver } from "@hookform/resolvers/yup"
import { useNotification } from "@talisman/components/Notification"
import { SimpleButton } from "@talisman/components/SimpleButton"
import Spacer from "@talisman/components/Spacer"
import { LedgerAccountPicker } from "@ui/domains/Account/LedgerAccountPicker"
import { useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
import { Navigate, useNavigate } from "react-router-dom"
import styled from "styled-components"
import * as yup from "yup"

import Layout from "../../layout"
import { LedgerAccountDef, useAddLedgerAccount } from "./context"

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

const H1 = styled.h1`
  margin: 0;
`

const Text = styled.p`
  color: var(--color-mid);
  margin: 3rem 0 2.4rem 0;
`

type FormData = {
  accounts: LedgerAccountDef[]
}

export const AddLedgerSelectAccount = () => {
  const { data, importAccounts } = useAddLedgerAccount()
  const navigate = useNavigate()
  const notification = useNotification()

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
    (accounts: LedgerAccountDef[]) => {
      setValue("accounts", accounts, { shouldValidate: true })
    },
    [setValue]
  )

  if (!data.chainId) return <Navigate to="./" replace />

  return (
    <Container withBack centered>
      <form data-button-pull-left onSubmit={handleSubmit(submit)}>
        <div className="grow">
          <H1>Import from Ledger</H1>
          <Text>Please select which account(s) you'd like to import.</Text>
          <LedgerAccountPicker chainId={data.chainId as string} onChange={handleAccountsChange} />
        </div>
        <div className="buttons">
          <SimpleButton type="submit" primary disabled={!isValid} processing={isSubmitting}>
            Continue
          </SimpleButton>
        </div>
        <Spacer />
      </form>
    </Container>
  )
}
