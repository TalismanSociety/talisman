import { AccountAddressType } from "@core/domains/accounts/types"
import { getEthDerivationPath } from "@core/domains/ethereum/helpers"
import { yupResolver } from "@hookform/resolvers/yup"
import { Checkbox } from "@talisman/components/Checkbox"
import { FormField } from "@talisman/components/Field/FormField"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { classNames } from "@talisman/util/classNames"
import { api } from "@ui/api"
import { AccountTypeSelector } from "@ui/domains/Account/AccountTypeSelector"
import AccountAvatar from "@ui/domains/Account/Avatar"
import useAccounts from "@ui/hooks/useAccounts"
import { Wallet } from "ethers"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"
import * as yup from "yup"

import Layout from "../../layout"
import { useAccountAddSecret } from "./context"

type FormData = {
  name: string
  type: AccountAddressType
  mnemonic: string
  multi: boolean
}

const Spacer = styled.div<{ small?: boolean }>`
  height: ${({ small }) => (small ? "1.6rem" : "3.2rem")};
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

  .invisible {
    opacity: 0;
  }

  .mnemonic-buttons {
    display: flex;
    position: absolute;
    bottom: 0;
    right: 0;

    button {
      margin: 0.8em;
      background-color: transparent;
      border: none;
      outline: none;
      color: var(--color-mid);
      cursor: pointer;
      font-size: var(--font-size-xsmall);
      padding: 0.8rem;
      border-radius: var(--border-radius-small);
      background: var(--color-background-muted-3x);
      opacity: 0.5;
      transition: all var(--transition-speed) ease-in-out;
      &:hover {
        opacity: 1;
      }
    }
  }

  .field > .children {
    position: relative;

    > .suffix {
      opacity: 1;
      transform: none;
      top: 0;
      right: 0;
      width: 4.8rem;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;

      > * {
        width: auto;
        height: auto;
      }
    }
  }
`

const cleanupMnemonic = (input = "") =>
  input
    .trim()
    .toLowerCase()
    .split(/[\s\r\n]+/g) //split on whitespace or carriage return
    .filter(Boolean) //remove empty strings
    .join(" ")

const isValidEthPrivateKey = (privateKey?: string) => {
  if (!privateKey) return false

  try {
    new Wallet(privateKey)
    return true
  } catch (err) {
    return false
  }
}

// for polkadot, do not force //0 derivation path to preserve backwards compatibility (since beta we import mnemonics as-is)
// but for ethereum, use metamask's derivation path
const ETHEREUM_DERIVATION_PATH = getEthDerivationPath()

const getAccountUri = async (secret: string, type: AccountAddressType) => {
  if (!secret || !type) throw new Error("Missing arguments")

  // metamask exports private key without the 0x in front of it
  // pjs keyring & crypto api will throw if it's missing
  if (type === "ethereum" && isValidEthPrivateKey(secret))
    return secret.startsWith("0x") ? secret : `0x${secret}`

  if (await testValidMnemonic(secret))
    return type === "ethereum" ? `${secret}${ETHEREUM_DERIVATION_PATH}` : secret
  throw new Error("Invalid secret phrase")
}

const testNoDuplicate = async (
  allAccountsAddresses: string[],
  type: AccountAddressType,
  mnemonic?: string
) => {
  if (!mnemonic) return false
  try {
    const uri = await getAccountUri(mnemonic, type)
    const address = await api.addressFromMnemonic(uri, type)
    return !allAccountsAddresses.includes(address)
  } catch (err) {
    return false
  }
}

const testValidMnemonic = async (val?: string) => {
  // Don't bother calling the api if the mnemonic isn't the right length to reduce Sentry noise
  if (!val || ![12, 24].includes(val.split(" ").length)) return false
  return await api.accountValidateMnemonic(val)
}

export const AccountAddSecretMnemonic = () => {
  const { data, updateData } = useAccountAddSecret()
  const navigate = useNavigate()

  const allAccounts = useAccounts()
  const accountAddresses = useMemo(() => allAccounts.map((a) => a.address), [allAccounts])

  const schema = useMemo(
    () =>
      yup
        .object({
          name: yup.string().trim().required(""),
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
                  (val) => isValidEthPrivateKey(val) || testValidMnemonic(val)
                )
                .when("multi", {
                  is: false,
                  then: yup
                    .string()
                    .test("not-duplicate-ethereum", "Account already exists", async (val) =>
                      testNoDuplicate(accountAddresses, "ethereum", val)
                    ),
                }),
              otherwise: yup
                .string()
                .test("is-valid-mnemonic-sr25519", "Invalid secret", (val) =>
                  testValidMnemonic(val)
                )
                .when("multi", {
                  is: false,
                  then: yup
                    .string()
                    .test("not-duplicate-sr25519", "Account already exists", async (val) =>
                      testNoDuplicate(accountAddresses, "sr25519", val)
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

  const { type, mnemonic } = watch()

  const isPrivateKey = useMemo(
    () => type === "ethereum" && isValidEthPrivateKey(mnemonic),
    [mnemonic, type]
  )
  useEffect(() => {
    if (isPrivateKey) setValue("multi", false, { shouldValidate: true })
  }, [isPrivateKey, setValue])

  const words = useMemo(
    () => cleanupMnemonic(mnemonic).split(" ").filter(Boolean).length ?? 0,
    [mnemonic]
  )

  const [targetAddress, setTargetAddress] = useState<string>()

  useEffect(() => {
    const refreshTargetAddress = async () => {
      try {
        const uri = await getAccountUri(mnemonic, type)
        setTargetAddress(await api.addressFromMnemonic(uri, type))
      } catch (err) {
        setTargetAddress(undefined)
      }
    }

    refreshTargetAddress()
  }, [isValid, mnemonic, type])

  const submit = useCallback(
    async ({ type, name, mnemonic, multi }: FormData) => {
      updateData({ type, name, mnemonic, multi })
      if (multi) navigate("accounts")
      else {
        const notificationId = notify(
          {
            type: "processing",
            title: "Importing account",
            subtitle: "Please wait",
          },
          { autoClose: false }
        )
        try {
          const uri = await getAccountUri(mnemonic, type)
          await api.accountCreateFromSeed(name, uri, type)
          notifyUpdate(notificationId, {
            type: "success",
            title: "Account imported",
            subtitle: name,
          })
          navigate("/portfolio")
        } catch (err) {
          notifyUpdate(notificationId, {
            type: "error",
            title: "Error importing account",
            subtitle: (err as Error)?.message ?? "",
          })
        }
      }
    },
    [navigate, updateData]
  )

  const handleTypeChange = useCallback(
    (type: AccountAddressType) => {
      setValue("type", type, { shouldValidate: true })
    },
    [setValue]
  )

  const handleGenerateNew = useCallback(() => {
    setValue("mnemonic", Wallet.createRandom().mnemonic.phrase, { shouldValidate: true })
  }, [setValue])

  return (
    <Container withBack centered>
      <HeaderBlock
        title="Choose account type"
        text="What type of account would you like to import ?"
      />
      <Spacer small />
      <AccountTypeSelector defaultType={data.type} onChange={handleTypeChange} />
      <Spacer />
      <form
        className={classNames(type && "show")}
        data-button-pull-left
        onSubmit={handleSubmit(submit)}
      >
        <FormField
          error={errors.name}
          suffix={
            targetAddress ? (
              <div>
                <AccountAvatar address={targetAddress} />
              </div>
            ) : null
          }
        >
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
          {/* Waiting for designers validation for this feature, but it's ready ! */}
          {/* <div className="mnemonic-buttons">
            <button type="button" onClick={handleGenerateNew}>
              Generate New
            </button>
          </div> */}
        </FormField>
        <Spacer small />
        <Spacer small />
        <Checkbox {...register("multi")} className={classNames(isPrivateKey && "invisible")}>
          Import multiple accounts from this secret phrase
        </Checkbox>
        <Spacer />
        <SimpleButton type="submit" primary disabled={!isValid} processing={isSubmitting}>
          Import
        </SimpleButton>
      </form>
    </Container>
  )
}
