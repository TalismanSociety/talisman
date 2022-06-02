import HeaderBlock from "@talisman/components/HeaderBlock"
import Spacer from "@talisman/components/Spacer"
import { useNavigate } from "react-router-dom"
import Layout from "../../layout"
import { useCallback, useEffect, useMemo } from "react"
import * as yup from "yup"
import { api } from "@ui/api"
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import { FormField } from "@talisman/components/Field/FormField"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { useAccountAddSecret } from "./context"
import { AccountAddressType } from "@core/types"
import { Checkbox } from "@talisman/components/Checkbox"
import styled from "styled-components"
import { useNotification } from "@talisman/components/Notification"
import useAccounts from "@ui/hooks/useAccounts"
import CtaButton from "@talisman/components/CtaButton"
import { EthereumCircleLogo, PolkadotCircleLogo } from "@talisman/theme/logos"
import { classNames } from "@talisman/util/classNames"
import { ethers } from "ethers"

type FormData = {
  name: string
  type: AccountAddressType
  mnemonic: string
  multi: boolean
}

const Buttons = styled.div`
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  gap: 2rem;
`

const AccountTypeButton = styled(CtaButton)`
  width: 29.6rem;
  > span.icon {
    width: 3.2rem;
    font-size: 3.2rem;
    margin: 0 1.2rem;
  }
  > span.arrow {
    display: none;
  }
  :hover {
    background: var(--color-background-muted-3x);
  }

  &.selected {
    outline: 1px solid var(--color-foreground-muted);
    cursor: default;
  }
`
const Container = styled(Layout)`
  .checkbox {
    color: var(--color-mid);
    font-size: 1.6rem;
    span:last-child {
      padding-top: 0.2rem;
    }
  }

  form {
    transition: opacity var(--transition-speed) ease-in-out;
    opacity: 0;
    &.show {
      opacity: 1;
    }
  }

  input[type="checkbox"]:disabled + span,
  input[type="checkbox"]:disabled + span + span {
    opacity: 0.5;
    cursor: default;
  }
`

const cleanupMnemonic = (input: string = "") =>
  input
    .trim()
    .toLowerCase()
    .split(/[\s\r\n]+/g) //split on whitespace or carriage return
    .filter(Boolean) //remove empty strings
    .join(" ")

// for polkadot, do not force //0 derivation path to preserve backwards compatibility (since beta we import mnemonics as-is)
// but for ethereum, use metamask's derivation path
const ETHEREUM_DERIVATION_PATH = "/m/44'/60'/0'/0/0"

const mnemonicUri = (mnemonic: string, type: AccountAddressType) => {
  return type === "ethereum" ? `${mnemonic}${ETHEREUM_DERIVATION_PATH}` : mnemonic
}

const isValidEthPrivateKey = (privateKey?: string) => {
  if (!privateKey?.startsWith("0x")) return false
  try {
    const w = new ethers.Wallet(privateKey)
    console.log(w)
    return true
  } catch (err) {
    return false
  }
}

const testNoDuplicate = async (
  mnemonic: string,
  allAccountsAddresses: string[],
  type: AccountAddressType
) => {
  //if ethereum it could also be a private key, in which case we don't append a derivation path
  try {
    const uri = isValidEthPrivateKey(mnemonic) ? mnemonic : mnemonicUri(mnemonic, type)
    const address = await api.addressFromMnemonic(uri, type)
    return !allAccountsAddresses.includes(address)
  } catch (err) {
    return false
  }
}

export const AccountAddSecretMnemonic = () => {
  const { data, updateData } = useAccountAddSecret()
  const navigate = useNavigate()

  const notification = useNotification()
  const allAccounts = useAccounts()
  const accountAddresses = useMemo(() => allAccounts.map((a) => a.address), [allAccounts])

  const schema = useMemo(
    () =>
      yup
        .object({
          name: yup.string().trim().required(),
          type: yup.string().required("").oneOf(["ethereum", "sr25519"]),
          multi: yup.boolean(),
          mnemonic: yup
            .string()
            .trim()
            .required("")
            .transform(cleanupMnemonic)
            .when("type", {
              is: "ethereum",
              then: yup
                .string()
                .test(
                  "is-valid-mnemonic-ethereum",
                  "Invalid secret",
                  (val) => isValidEthPrivateKey(val) || api.accountValidateMnemonic(val!)
                )
                .when("multi", {
                  is: false,
                  then: yup
                    .string()
                    .test("not-duplicate-ethereum", "Account already exists", async (val) =>
                      testNoDuplicate(val!, accountAddresses, "ethereum")
                    ),
                }),
              otherwise: yup
                .string()
                .test("is-valid-mnemonic-sr25519", "Invalid secret", (val) =>
                  api.accountValidateMnemonic(val!)
                )
                .when("multi", {
                  is: false,
                  then: yup
                    .string()
                    .test("not-duplicate-sr25519", "Account already exists", async (val) =>
                      testNoDuplicate(val!, accountAddresses, "sr25519")
                    ),
                }),
            }),
        })
        .required(),
    [accountAddresses]
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    defaultValues: data,
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const submit = useCallback(
    async ({ type, name, mnemonic, multi }: FormData) => {
      updateData({ type, name, mnemonic, multi })
      if (multi) navigate("../accounts")
      else {
        notification.processing({
          title: `Importing account`,
          subtitle: "Please wait",
          timeout: null,
        })
        try {
          await api.accountCreateFromSeed(name, mnemonicUri(mnemonic, type), type)
          notification.success({
            title: "Account imported",
            subtitle: name,
          })
          navigate("/accounts")
        } catch (err) {
          notification.error({
            title: "Error importing account",
            subtitle: (err as Error)?.message ?? "",
          })
        }
      }
    },
    [navigate, notification, updateData]
  )

  const { type, mnemonic } = watch()
  const isPrivateKey = useMemo(
    () => type === "ethereum" && isValidEthPrivateKey(mnemonic),
    [mnemonic, type]
  )
  useEffect(() => {
    if (isPrivateKey) setValue("multi", false)
  }, [isPrivateKey, setValue])

  const words = useMemo(
    () => cleanupMnemonic(mnemonic).split(" ").filter(Boolean).length ?? 0,
    [mnemonic]
  )

  const handleTypeClick = useCallback(
    (type: AccountAddressType) => () => {
      setValue("type", type, { shouldValidate: true })
    },
    [setValue]
  )

  return (
    <Container withBack centered>
      <HeaderBlock
        title="Choose account type"
        text="What type of account would you like to import ?"
      />
      <Spacer small />
      <Buttons>
        <AccountTypeButton
          title="Polkadot"
          className={classNames(type === "sr25519" && "selected")}
          icon={<PolkadotCircleLogo />}
          subtitle="Polkadot, Kusama &amp; Parachains"
          onClick={handleTypeClick("sr25519")}
        />
        <AccountTypeButton
          title="Ethereum"
          className={classNames(type === "ethereum" && "selected")}
          icon={<EthereumCircleLogo />}
          subtitle="Moonbeam, Moonriver, Astar etc."
          onClick={handleTypeClick("ethereum")}
        />
      </Buttons>
      <Spacer />
      <form
        className={classNames(type && "show")}
        data-button-pull-left
        onSubmit={handleSubmit(submit)}
      >
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
        <Spacer small />
        <FormField error={errors.mnemonic} extra={`Word count : ${words}`}>
          <textarea
            {...register("mnemonic")}
            placeholder={`Enter your 12 or 24 word Secret Phrase${
              type === "ethereum" ? " or private key" : ""
            }`}
            rows={5}
            data-lpignore
            spellCheck={false}
          />
        </FormField>
        <Spacer small />
        <Spacer small />
        <Checkbox {...register("multi")} disabled={isPrivateKey}>
          Import multiple accounts from this secret phrase
        </Checkbox>
        <Spacer small />
        <SimpleButton type="submit" primary disabled={!isValid} processing={isSubmitting}>
          Import
        </SimpleButton>
      </form>
    </Container>
  )
}
