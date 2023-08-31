import { AccountAddressType } from "@core/domains/accounts/types"
import { getEthDerivationPath } from "@core/domains/ethereum/helpers"
import { yupResolver } from "@hookform/resolvers/yup"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { Spacer } from "@talisman/components/Spacer"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeSelector } from "@ui/domains/Account/AccountTypeSelector"
import useAccounts from "@ui/hooks/useAccounts"
import { Wallet } from "ethers"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import {
  Button,
  Checkbox,
  FormFieldContainer,
  FormFieldInputText,
  FormFieldTextarea,
} from "talisman-ui"
import * as yup from "yup"

import { useAccountAddSecret } from "./context"

type FormData = {
  name: string
  type: AccountAddressType
  mnemonic: string
  multi: boolean
}

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
  throw new Error("Invalid recovery phrase")
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
  return await api.validateMnemonic(val)
}

export const AccountAddSecretMnemonicForm = () => {
  const { t } = useTranslation("admin")

  const { data, updateData, onSuccess } = useAccountAddSecret()
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
                  t("Invalid secret"),
                  (val) => isValidEthPrivateKey(val) || testValidMnemonic(val)
                )
                .when("multi", {
                  is: false,
                  then: yup
                    .string()
                    .test("not-duplicate-ethereum", t("Account already exists"), async (val) =>
                      testNoDuplicate(accountAddresses, "ethereum", val)
                    ),
                }),
              otherwise: yup
                .string()
                .test("is-valid-mnemonic-sr25519", t("Invalid secret"), (val) =>
                  testValidMnemonic(val)
                )
                .when("multi", {
                  is: false,
                  then: yup
                    .string()
                    .test("not-duplicate-sr25519", t("Account already exists"), async (val) =>
                      testNoDuplicate(accountAddresses, "sr25519", val)
                    ),
                }),
            }),
        })
        .required(),
    [t, accountAddresses]
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
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
        const uri = await getAccountUri(cleanupMnemonic(mnemonic), type)
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
      if (multi) navigate("multiple")
      else {
        const notificationId = notify(
          {
            type: "processing",
            title: t("Importing account"),
            subtitle: t("Please wait"),
          },
          { autoClose: false }
        )
        try {
          const uri = await getAccountUri(mnemonic, type)
          onSuccess(await api.accountCreateFromSeed(name, uri, type))
          notifyUpdate(notificationId, {
            type: "success",
            title: t("Account imported"),
            subtitle: name,
          })
        } catch (err) {
          notifyUpdate(notificationId, {
            type: "error",
            title: t("Error importing account"),
            subtitle: (err as Error)?.message ?? "",
          })
        }
      }
    },
    [t, navigate, onSuccess, updateData]
  )

  const handleTypeChange = useCallback(
    (type: AccountAddressType) => {
      setValue("type", type, { shouldValidate: true })
      // revalidate to get rid of "invalid mnemonic" with a private key, when switching to ethereum
      trigger()
    },
    [setValue, trigger]
  )

  return (
    <div className="flex w-full flex-col gap-8">
      <HeaderBlock
        title={t("Choose account type")}
        text={t("What type of account would you like to import?")}
      />

      <AccountTypeSelector defaultType={data.type} onChange={handleTypeChange} />

      <form className={classNames(type ? "visible" : "invisible")} onSubmit={handleSubmit(submit)}>
        <FormFieldContainer error={errors.name?.message}>
          <FormFieldInputText
            {...register("name")}
            placeholder={t("Choose a name")}
            spellCheck={false}
            autoComplete="off"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            data-lpignore
            after={
              targetAddress ? <AccountIcon address={targetAddress} className="text-xl" /> : null
            }
          />
        </FormFieldContainer>
        <FormFieldTextarea
          {...register("mnemonic")}
          placeholder={
            type === "ethereum"
              ? t("Enter your 12 or 24 word recovery phrase or private key")
              : t("Enter your 12 or 24 word recovery phrase")
          }
          rows={5}
          data-lpignore
          spellCheck={false}
        />
        <div className="mt-8 flex justify-between text-xs">
          <div className="text-body-secondary">{t("Word count: {{words}}", { words })}</div>
          <div className="text-alert-warn text-right">{errors.mnemonic?.message}</div>
        </div>
        <Spacer small />
        <Checkbox
          {...register("multi")}
          className={classNames("text-body-secondary", isPrivateKey && "invisible")}
        >
          {t("Import multiple accounts from this recovery phrase")}
        </Checkbox>
        <Spacer small />
        <div className="mt-1 flex w-full justify-end">
          <Button
            className="w-[24rem]"
            type="submit"
            primary
            disabled={!isValid}
            processing={isSubmitting}
          >
            {t("Import")}
          </Button>
        </div>
      </form>
    </div>
  )
}
