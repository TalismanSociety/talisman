/* eslint-disable react/no-children-prop */

import {
  AccountPlatform,
  addressEncodingFromCurve,
  addressFromPublicKey,
  base64,
  getPublicKeyFromSecret,
  KeypairCurve,
  parseSecretKey,
} from "@talismn/crypto"
import { useField, useForm } from "@tanstack/react-form"
import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import {
  Button,
  FormFieldContainer,
  FormFieldInputText,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "talisman-ui"
import { z } from "zod/v4"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { Spacer } from "@talisman/components/Spacer"
import { api } from "@ui/api"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { useAccounts } from "@ui/state"

import { AccountPlatformDropdown } from "../AccountPlatformDropdown"
import { BackToAddAccountButton } from "./BackToAddAccountButton"
import { AccountAddPageProps } from "./types"

const SUPPORTED_ACCOUNT_PLATFORMS: AccountPlatform[] = ["ethereum", "solana"]

const platformToCurve = (platform: AccountPlatform): KeypairCurve => {
  switch (platform) {
    case "ethereum":
      return "ethereum"
    case "solana":
      return "solana"
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

const privateKeyToAddress = (privateKey: string, platform: AccountPlatform) => {
  try {
    const secretKey = parseSecretKey(privateKey, platform)
    const curve = platformToCurve(platform)
    const publicKey = getPublicKeyFromSecret(secretKey, curve)
    const encoding = addressEncodingFromCurve(curve)
    return addressFromPublicKey(publicKey, encoding)
  } catch {
    return null
  }
}

const isValidPrivateKey = (privateKey: string, platform: AccountPlatform) => {
  try {
    return Boolean(privateKeyToAddress(privateKey, platform))
  } catch (err) {
    return false
  }
}

export const AccountAddPrivateKeyForm = ({ onSuccess }: AccountAddPageProps) => {
  const { t } = useTranslation()
  const allAccounts = useAccounts()
  const existingAccountNames = useMemo(
    () => allAccounts.map((a) => a.name.trim().toLowerCase()),
    [allAccounts],
  )
  const existingAccountAddresses = useMemo(() => allAccounts.map((a) => a.address), [allAccounts])

  const FormSchema = useMemo(
    () =>
      z
        .object({
          platform: z.enum(SUPPORTED_ACCOUNT_PLATFORMS),
          name: z
            .string()
            .nonempty()
            .refine((name) => !existingAccountNames.includes(name), {
              message: "Account name already exists",
              path: ["privateKey"],
            }),
          privateKey: z.string().nonempty(),
        })
        .refine((data) => isValidPrivateKey(data.privateKey, data.platform), {
          message: "Invalid private key for selected platform",
          path: ["privateKey"],
        })
        .refine(
          (data) =>
            !existingAccountAddresses.includes(
              privateKeyToAddress(data.privateKey, data.platform) as string,
            ),
          {
            message: "Account already exists",
            path: ["privateKey"],
          },
        ),
    [existingAccountAddresses, existingAccountNames],
  )

  const form = useForm({
    defaultValues: {
      name: "",
      privateKey: "",
    } as z.infer<typeof FormSchema>,
    onSubmit: async ({ value }) => {
      const notificationId = notify(
        {
          type: "processing",
          title: t("Importing account"),
          subtitle: t("Please wait"),
        },
        { autoClose: false },
      )
      try {
        const secretKey = parseSecretKey(value.privateKey, value.platform)
        const curve = platformToCurve(value.platform)

        const [address] = await api.accountAddKeypair([
          {
            name: value.name,
            curve,
            secretKey: base64.encode(secretKey),
          },
        ])

        onSuccess(address)
        notifyUpdate(notificationId, {
          type: "success",
          title: t("Account imported"),
          subtitle: value.name,
        })
      } catch (err) {
        notifyUpdate(notificationId, {
          type: "error",
          title: t("Error importing account"),
          subtitle: (err as Error)?.message ?? "",
        })
      }
    },
    validators: {
      onMount: ({ value }) => (FormSchema.safeParse(value).success ? null : "invalid"),
      onChange: ({ value }) => (FormSchema.safeParse(value).success ? null : "invalid"),
    },
  })

  useEffect(() => {
    return () => {
      form.reset() // so private key is cleared from memory
    }
  }, [form])

  const fldPlatform = useField({ form, name: "platform" })
  const fldPrivateKey = useField({ form, name: "privateKey" })
  const targetAddress = useMemo(() => {
    if (!fldPlatform.state.value || !fldPrivateKey.state.value) return null
    return privateKeyToAddress(fldPrivateKey.state.value, fldPlatform.state.value)
  }, [fldPlatform.state.value, fldPrivateKey.state.value])

  return (
    <div className="flex w-full flex-col gap-8">
      <HeaderBlock title={t("Import via Private Key")} />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <form.Field
          name="platform"
          children={(field) => (
            <AccountPlatformDropdown
              value={field.state.value}
              platforms={SUPPORTED_ACCOUNT_PLATFORMS}
              onChange={(platform) => {
                field.handleChange(platform)
                field.form.validateField("privateKey", "change")
              }}
              className="h-28"
            />
          )}
        />
        <Spacer small />
        <form.Field
          name="name"
          children={(field) => (
            <FormFieldContainer error={field.state.meta.errors[0]}>
              <FormFieldInputText
                value={field.state.value}
                placeholder={t("Choose a name")}
                spellCheck={false}
                autoComplete="off"
                data-lpignore
                translate="no"
                onChange={(e) => field.handleChange(e.target.value)}
                after={
                  targetAddress ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="size-16">
                          <AccountIcon address={targetAddress} className="text-xl" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{targetAddress}</TooltipContent>
                    </Tooltip>
                  ) : null
                }
              />
            </FormFieldContainer>
          )}
          validators={{
            onChange: ({ value }) => {
              const check = value.trim().toLowerCase()
              if (value.trim() === "") return t("Account name is required")
              if (existingAccountNames.includes(check)) return t("Account name already exists")
              return null
            },
          }}
        />
        <form.Field
          name="privateKey"
          children={(field) => (
            <FormFieldContainer error={field.state.meta.errors[0]}>
              <FormFieldInputText
                value={field.state.value}
                placeholder={t("Enter your private key")}
                spellCheck={false}
                autoComplete="off"
                data-lpignore
                translate="no"
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </FormFieldContainer>
          )}
          validators={{
            onChange: ({ value, fieldApi }) => {
              const platform = fieldApi.form.getFieldValue("platform")
              if (!platform) return null // don't validate until a platform is chosen
              const address = privateKeyToAddress(value, platform)
              if (value && !address) return t("Invalid private key")
              if (address && existingAccountAddresses.includes(address))
                return t("Account already exists")

              return null
            },
          }}
        />
        <Spacer small />
        <div className="mt-1 flex w-full justify-between">
          <BackToAddAccountButton methodType="import" />
          <form.Subscribe
            selector={(state) => [
              state.canSubmit,
              state.isSubmitting,
              state.isValidating,
              state.isValid,
            ]}
            children={([canSubmit, isSubmitting, isValidating]) => (
              <Button
                primary
                className="h-24"
                type="submit"
                processing={isSubmitting || isValidating}
                disabled={!canSubmit && !isSubmitting && !isValidating}
              >
                {t("Save")}
              </Button>
            )}
          />
        </div>
      </form>
    </div>
  )
}
