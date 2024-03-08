import { AssetDiscoveryMode } from "@extension/core"
import { yupResolver } from "@hookform/resolvers/yup"
import { secp256k1 } from "@noble/curves/secp256k1"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { Spacer } from "@talisman/components/Spacer"
import { encodeAnyAddress } from "@talismn/util"
import { api } from "@ui/api"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import useAccounts from "@ui/hooks/useAccounts"
import i18next from "i18next"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import {
  Button,
  FormFieldContainer,
  FormFieldInputText,
  FormFieldTextarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "talisman-ui"
import { isHex, toHex } from "viem"
import { publicKeyToAddress } from "viem/accounts"
import * as yup from "yup"

import { AccountAddPageProps } from "./types"

/**
 * A minimal version of viem's privateKeyToAccount that only returns an address
 * @param privateKey: `0x${string}`
 * @returns string
 */
const privateKeyToAddress = (privateKey: `0x${string}`) => {
  const publicKey = toHex(secp256k1.getPublicKey(privateKey.slice(2), false))
  return publicKeyToAddress(publicKey)
}

const isValidEthPrivateKey = (privateKey: `0x${string}`) => {
  try {
    if (!isHex(privateKey)) return false
    return Boolean(privateKeyToAddress(privateKey))
  } catch (err) {
    return false
  }
}

/**
 * metamask exports private key without the 0x in front of it
 * pjs keyring & crypto api will throw if it's missing
 * @param privateKey: string
 * @returns `0x${string}`
 */
const transformToHex = (privateKey: string): `0x${string}` =>
  privateKey?.startsWith("0x") ? (privateKey as `0x${string}`) : `0x${privateKey}`

type FormData = {
  name: string
  privateKey: string
}

type ValidationContext = {
  accountEthAddresses: string[]
}

const schema = yup
  .object({
    name: yup.string().trim().required(""),
    privateKey: yup
      .string()
      .required("")
      .trim()
      .lowercase()
      .transform(transformToHex)
      .test("is-valid-mnemonic-ethereum", i18next.t("Invalid private key"), async (val) =>
        isValidEthPrivateKey(val as `0x${string}`)
      )
      .test("account-exists", i18next.t("Account exists"), async (privateKey, ctx) => {
        const context = ctx.options.context as ValidationContext
        let address: string
        try {
          address = privateKeyToAddress(privateKey as `0x${string}`)
        } catch (err) {
          return ctx.createError({
            path: "privateKey",
            message: i18next.t("Error importing account"),
          })
        }

        if (context.accountEthAddresses.some((a) => encodeAnyAddress(a) === address))
          return ctx.createError({
            path: "privateKey",
            message: i18next.t("Account already exists"),
          })

        return true
      }),
  })
  .required()

export const AccountAddPrivateKeyForm = ({ onSuccess }: AccountAddPageProps) => {
  const { t } = useTranslation("admin")

  const allAccounts = useAccounts()
  const accountEthAddresses = useMemo(
    () => allAccounts.filter(({ type }) => type === "ethereum").map((a) => a.address),
    [allAccounts]
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData, ValidationContext>({
    mode: "onChange",
    resolver: yupResolver(schema),
    context: { accountEthAddresses },
  })

  const privateKey = watch("privateKey")

  const [targetAddress, setTargetAddress] = useState<string>()

  useEffect(() => {
    const refreshTargetAddress = async () => {
      try {
        if (!isValid) return setTargetAddress(undefined)
        setTargetAddress(privateKeyToAddress(transformToHex(privateKey)))
      } catch (err) {
        setTargetAddress(undefined)
      }
    }

    refreshTargetAddress()
  }, [isValid, privateKey])

  const submit = useCallback(
    async ({ name, privateKey }: FormData) => {
      const notificationId = notify(
        {
          type: "processing",
          title: t("Importing account"),
          subtitle: t("Please wait"),
        },
        { autoClose: false }
      )
      try {
        const address = await api.accountCreateFromSuri(name, privateKey, "ethereum")

        api.assetDiscoveryStartScan(AssetDiscoveryMode.ACTIVE_NETWORKS, [address])

        onSuccess(address)
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
    },
    [t, onSuccess]
  )

  useEffect(() => {
    return () => {
      setValue("privateKey", "")
    }
  }, [setValue])

  return (
    <div className="flex w-full flex-col gap-8">
      <HeaderBlock title={t("Import Ethereum Private Key")} />

      <form onSubmit={handleSubmit(submit)}>
        <FormFieldContainer error={errors.name?.message}>
          <FormFieldInputText
            {...register("name")}
            placeholder={t("Choose a name")}
            spellCheck={false}
            autoComplete="off"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            data-lpignore
            translate="no"
            after={
              targetAddress ? (
                <Tooltip>
                  <TooltipTrigger>
                    <AccountIcon address={targetAddress} className="text-xl" />
                  </TooltipTrigger>
                  <TooltipContent>{targetAddress}</TooltipContent>
                </Tooltip>
              ) : null
            }
          />
        </FormFieldContainer>
        <FormFieldTextarea
          {...register("privateKey")}
          placeholder={t("Enter your private key")}
          rows={2}
          data-lpignore
          translate="no"
          spellCheck={false}
        />
        <div className="mt-2 flex w-full overflow-hidden text-xs">
          <div className="text-alert-warn grow truncate text-right">
            {errors.privateKey?.message}
          </div>
        </div>
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
