import { LedgerEthDerivationPathType } from "@core/domains/ethereum/types"
import { sleep } from "@core/util/sleep"
import { yupResolver } from "@hookform/resolvers/yup"
import { Dropdown } from "@talisman/components/Dropdown"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { SimpleButton } from "@talisman/components/SimpleButton"
import Spacer from "@talisman/components/Spacer"
import { LedgerEthereumAccountPicker } from "@ui/domains/Account/LedgerEthereumAccountPicker"
import { LedgerSubstrateAccountPicker } from "@ui/domains/Account/LedgerSubstrateAccountPicker"
import { FC, useCallback, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { Navigate, useNavigate } from "react-router-dom"
import styled from "styled-components"
import * as yup from "yup"

import Layout from "../../layout"
import { LedgerAccountDef, useAddLedgerAccount } from "./context"

const options: Record<LedgerEthDerivationPathType, string> = {
  LedgerLive: "Ledger Live",
  Legacy: "Legacy (MEW, MyCrypto)",
  BIP44: "BIP44 Standard (MetaMask, Trezor)",
}

type Option = { key: LedgerEthDerivationPathType; label: string }

const items = Object.entries(options).map<Option>(([key, value]) => ({
  key: key as LedgerEthDerivationPathType,
  label: value,
}))

type LedgerDerivationPathSelectorProps = {
  defaultValue: LedgerEthDerivationPathType
  onChange: (value: LedgerEthDerivationPathType) => void
}

const LedgerDerivationPathSelector: FC<LedgerDerivationPathSelectorProps> = ({
  defaultValue = "LedgerLive",
  onChange,
}) => {
  const defaultSelectedItem = useMemo(
    () => items.find((i) => i.key === defaultValue),
    [defaultValue]
  )

  const handleChange = useCallback(
    (item: Option | null) => {
      if (item) onChange(item.key)
    },
    [onChange]
  )

  return (
    <Dropdown
      items={items}
      defaultSelectedItem={defaultSelectedItem}
      propertyKey="key"
      renderItem={(item) => <div>{item.label}</div>}
      onChange={handleChange}
    />
  )
}

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
  margin: 1em 0 2.4rem 0;
`

type FormData = {
  accounts: LedgerAccountDef[]
}

export const AddLedgerSelectAccount = () => {
  const { data, importAccounts } = useAddLedgerAccount()
  const navigate = useNavigate()

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

      const notificationId = notify(
        {
          type: "processing",
          title: "Importing account" + suffix,
          subtitle: "Please wait",
        },
        { autoClose: false }
      )

      // pause to prevent double notification
      await sleep(1000)

      try {
        await importAccounts(accounts)
        notifyUpdate(notificationId, {
          type: "success",
          title: `Account${suffix} imported`,
          subtitle: null,
        })
        navigate("/")
      } catch (err) {
        notifyUpdate(notificationId, {
          type: "error",
          title: "Importing account" + suffix,
          subtitle: (err as Error).message,
        })
      }
    },
    [importAccounts, navigate]
  )

  const handleAccountsChange = useCallback(
    (accounts: LedgerAccountDef[]) => {
      setValue("accounts", accounts, { shouldValidate: true })
    },
    [setValue]
  )

  const [derivationPath, setDerivationPath] = useState<LedgerEthDerivationPathType>("LedgerLive")

  if (!data.type) return <Navigate to="/accounts/add/ledger" replace />
  if (data.type === "sr25519" && !data.chainId)
    return <Navigate to="/accounts/add/ledger" replace />

  return (
    <Container withBack centered>
      <form data-button-pull-left onSubmit={handleSubmit(submit)}>
        <div className="grow">
          <H1>Import from Ledger</H1>
          {data.type === "ethereum" && (
            <>
              <Text>
                The derivation path will be different based on which application you used to
                initialise your Ledger account.
              </Text>
              <div>
                <LedgerDerivationPathSelector
                  defaultValue="LedgerLive"
                  onChange={setDerivationPath}
                />
              </div>
              <div className="h-4" />
            </>
          )}
          <Text>
            Please select which account(s) you'd like to import.
            {data.type === "ethereum" && (
              <>
                <br />
                Amounts displayed for each account are the sum of GLMR, MOVR, ASTR and ETH.
              </>
            )}
          </Text>
          {data.type === "sr25519" && (
            <LedgerSubstrateAccountPicker
              chainId={data.chainId as string}
              onChange={handleAccountsChange}
            />
          )}
          {data.type === "ethereum" && (
            <LedgerEthereumAccountPicker
              name="Ledger Ethereum"
              derivationPathType={derivationPath}
              onChange={handleAccountsChange}
            />
          )}
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
