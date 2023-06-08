import { RequestAccountCreateFromSeed } from "@core/domains/accounts/types"
import { yupResolver } from "@hookform/resolvers/yup"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { SimpleButton } from "@talisman/components/SimpleButton"
import Spacer from "@talisman/components/Spacer"
import { DerivedFromMnemonicAccountPicker } from "@ui/domains/Account/DerivedFromMnemonicAccountPicker"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { useCallback, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Navigate, useNavigate } from "react-router-dom"
import styled from "styled-components"
import * as yup from "yup"

import Layout from "../../layout"
import { useAccountAddSecret } from "./context"

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
  const { t } = useTranslation("account-add")
  const { data, importAccounts } = useAccountAddSecret()
  const navigate = useNavigate()
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  const name = useMemo(
    () => data.name ?? (data.type === "ethereum" ? t("Ethereum Account") : t("Polkadot Account")),
    [data.name, data.type, t]
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
      const notificationId = notify(
        {
          type: "processing",
          title: t("Importing account", { count: accounts.length }),
          subtitle: "Please wait",
        },
        { autoClose: false }
      )
      try {
        const addresses = await importAccounts(accounts)

        notifyUpdate(notificationId, {
          type: "success",
          title: t("Account imported", { count: accounts.length }),
          subtitle: null,
        })

        setAddress(addresses[0])
      } catch (err) {
        notifyUpdate(notificationId, {
          type: "error",
          title: t("Importing account", { count: accounts.length }),
          subtitle: (err as Error).message,
        })
      }
    },
    [importAccounts, setAddress, t]
  )

  const handleAccountsChange = useCallback(
    (accounts: RequestAccountCreateFromSeed[]) => {
      setValue("accounts", accounts, { shouldValidate: true })
    },
    [setValue]
  )

  useEffect(() => {
    if (!data.mnemonic || !data.type) return navigate("")
  }, [data.mnemonic, data.type, navigate])

  const accounts = watch("accounts")

  // invalid state, useEffect above will redirect to previous form
  if (!data.mnemonic || !data.type) return <Navigate to="/accounts/add/secret" />

  return (
    <Container withBack centered>
      <form data-button-pull-left onSubmit={handleSubmit(submit)}>
        <div className="grow">
          <HeaderBlock
            title={t("Import {{accountType}} account(s)", {
              accountType: data?.type === "ethereum" ? t("Ethereum") : t("Polkadot"),
            })}
            text={t("Please select which account(s) you'd like to import.")}
          />
          <Spacer />
          <DerivedFromMnemonicAccountPicker
            name={name}
            mnemonic={data.mnemonic}
            type={data.type}
            onChange={handleAccountsChange}
          />
        </div>

        <div className="buttons">
          <SimpleButton type="submit" primary disabled={!isValid} processing={isSubmitting}>
            {t("Import")} {accounts?.length || ""}
          </SimpleButton>
        </div>
        <Spacer />
      </form>
    </Container>
  )
}
