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

type FormData = {
  mnemonic: string
  multi: boolean
}

const Container = styled(Layout)`
  .checkbox {
    color: var(--color-mid);
    font-size: 1.6rem;
    span:last-child {
      padding-top: 0.2rem;
    }
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
          multi: yup.boolean(),
          mnemonic: yup
            .string()
            .trim()
            .required("")
            .transform(cleanupMnemonic)
            .test("is-valid-mnemonic2", "Invalid secret", async (val) => {
              try {
                const address = await api.addressFromMnemonic(
                  mnemonicUri(val as string, data.type!),
                  data.type
                )
                return address.length > 0
              } catch (err) {
                return false
              }
            })
            .when("multi", {
              is: false,
              then: yup.string().test("not-duplicate", "Account already exists", async (val) => {
                try {
                  return (
                    "false" === yup.ref<boolean>("multi").toString() ||
                    !accountAddresses.includes(
                      await api.addressFromMnemonic(
                        mnemonicUri(val as string, data.type!),
                        data.type
                      )
                    )
                  )
                } catch (err) {
                  return false
                }
              }),
            }),
        })
        .required(),
    [data.type, accountAddresses]
  )

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, isSubmitting },
    trigger,
  } = useForm<FormData>({
    defaultValues: data,
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const submit = useCallback(
    async ({ mnemonic, multi }: FormData) => {
      updateData({ mnemonic, multi })
      if (multi) navigate("../accounts")
      else {
        notification.processing({
          title: `Importing account`,
          subtitle: "Please wait",
          timeout: null,
        })
        try {
          const name = data.type! === "ethereum" ? "Ethereum Account" : "Polkadot Account"
          await api.accountCreateFromSeed(name, mnemonicUri(mnemonic, data.type!), data.type!)
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
    [data.type, navigate, notification, updateData]
  )

  const mnemonic = watch("mnemonic")
  const words = useMemo(
    () => cleanupMnemonic(mnemonic).split(" ").filter(Boolean).length ?? 0,
    [mnemonic]
  )

  const multi = watch("multi")
  useEffect(() => {
    trigger("mnemonic")
  }, [multi, trigger])

  return (
    <Container withBack centered>
      <HeaderBlock
        title={`Import ${data?.type === "ethereum" ? "Ethereum" : "Polkadot"} accounts`}
        text="Please enter your 12 or 24 word seed phrase seperated by a space."
      />
      <Spacer />
      <form data-button-pull-left onSubmit={handleSubmit(submit)}>
        <FormField error={errors.mnemonic} extra={`Word count : ${words}`}>
          <textarea
            {...register("mnemonic")}
            placeholder="Enter your 12 or 24 word Secret Phrase"
            rows={5}
            data-lpignore
            spellCheck={false}
          />
        </FormField>
        <Spacer />
        <Checkbox {...register("multi")}>Import multiple accounts from this secret phrase</Checkbox>
        <Spacer small />
        <SimpleButton type="submit" primary disabled={!isValid} processing={isSubmitting}>
          Import
        </SimpleButton>
      </form>
    </Container>
  )
}
