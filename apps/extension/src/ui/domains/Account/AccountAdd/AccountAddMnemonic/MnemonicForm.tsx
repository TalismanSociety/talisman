import { AccountAddressType } from "@extension/core"
import { AssetDiscoveryMode } from "@extension/core"
import { getEthDerivationPath } from "@extension/core"
import { yupResolver } from "@hookform/resolvers/yup"
import { mnemonicValidate } from "@polkadot/util-crypto"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { Spacer } from "@talisman/components/Spacer"
import { classNames, encodeAnyAddress } from "@talismn/util"
import { api } from "@ui/api"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeSelector } from "@ui/domains/Account/AccountTypeSelector"
import useAccounts from "@ui/hooks/useAccounts"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import {
  Button,
  FormFieldContainer,
  FormFieldInputText,
  FormFieldTextarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "talisman-ui"
import * as yup from "yup"

import { AccountAddDerivationMode, useAccountAddSecret } from "./context"
import { DerivationModeDropdown } from "./DerivationModeDropdown"

const cleanupMnemonic = (input = "") =>
  input
    .trim()
    .toLowerCase()
    .split(/[\s\r\n]+/g) //split on whitespace or carriage return
    .filter(Boolean) //remove empty strings
    .join(" ")

const getSuri = (secret: string, type: AccountAddressType, derivationPath?: string) => {
  if (!secret || !type) return null

  if (!mnemonicValidate(secret)) return null

  return derivationPath && !derivationPath.startsWith("/")
    ? `${secret}/${derivationPath}`
    : `${secret}${derivationPath}`
}

type FormData = {
  name: string
  type: AccountAddressType
  mnemonic: string
  mode: AccountAddDerivationMode
  derivationPath: string
}

export const AccountAddMnemonicForm = () => {
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
          mode: yup.string().required("").oneOf(["first", "custom", "multi"]),
          derivationPath: yup.string().trim(),
          mnemonic: yup
            .string()
            .trim()
            .required("")
            .transform(cleanupMnemonic)
            .test("is-valid-mnemonic", t("Invalid recovery phrase"), async (val) =>
              api.validateMnemonic(val as string)
            ),
        })
        .required()
        .test("account-exists", t("Account exists"), async (val, ctx) => {
          const { mnemonic, type, derivationPath, mode } = val as FormData
          if (!val || mode === "multi") return true

          const suri = getSuri(mnemonic, type, derivationPath)
          if (!suri) return true

          let address: string
          try {
            address = await api.addressLookup({ suri, type })
          } catch (err) {
            return ctx.createError({
              path: "derivationPath",
              message: t("Invalid derivation path"),
            })
          }

          if (accountAddresses.some((a) => encodeAnyAddress(a) === address))
            return ctx.createError({
              path: mode === "custom" ? "derivationPath" : "mnemonic",
              message: t("Account already exists"),
            })

          return true
        }),
    [accountAddresses, t]
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

  const { type, mnemonic, mode, derivationPath } = watch()

  const words = useMemo(
    () => cleanupMnemonic(mnemonic).split(" ").filter(Boolean).length ?? 0,
    [mnemonic]
  )

  const [targetAddress, setTargetAddress] = useState<string>()

  useEffect(() => {
    const refreshTargetAddress = async () => {
      try {
        const suri = getSuri(cleanupMnemonic(mnemonic), type, derivationPath)
        if (!suri) return setTargetAddress(undefined)
        setTargetAddress(await api.addressLookup({ suri, type }))
      } catch (err) {
        setTargetAddress(undefined)
      }
    }

    refreshTargetAddress()
  }, [derivationPath, isValid, mnemonic, type])

  const submit = useCallback(
    async ({ type, name, mnemonic, mode, derivationPath }: FormData) => {
      updateData({ type, name, mnemonic, mode, derivationPath })
      if (mode === "multi") navigate("multiple")
      else {
        const suri = getSuri(mnemonic, type, derivationPath)
        if (!suri) return

        const notificationId = notify(
          {
            type: "processing",
            title: t("Importing account"),
            subtitle: t("Please wait"),
          },
          { autoClose: false }
        )
        try {
          const address = await api.accountCreateFromSuri(name, suri, type)

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
      }
    },
    [t, navigate, onSuccess, updateData]
  )

  const handleTypeChange = useCallback(
    (type: AccountAddressType) => {
      setValue("type", type, { shouldValidate: true })
      setValue("derivationPath", type === "ethereum" ? getEthDerivationPath() : "", {
        shouldValidate: true,
      })
    },
    [setValue]
  )

  const handleModeChange = useCallback(
    (mode: AccountAddDerivationMode) => {
      setValue("mode", mode, { shouldValidate: true })
      if (mode === "first")
        setValue("derivationPath", type === "ethereum" ? getEthDerivationPath() : "", {
          shouldValidate: true,
        })
    },
    [setValue, type]
  )

  useEffect(() => {
    return () => {
      setValue("mnemonic", "")
    }
  }, [setValue])

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
          {...register("mnemonic")}
          placeholder={t("Enter your 12 or 24 word recovery phrase")}
          rows={5}
          data-lpignore
          spellCheck={false}
        />
        <div className="mt-2 flex w-full items-center justify-between gap-4 overflow-hidden text-xs">
          <div className="text-grey-600 shrink-0">{t("Word count: {{words}}", { words })}</div>
          <div className="text-alert-warn grow truncate text-right">{errors.mnemonic?.message}</div>
        </div>
        <Spacer small />
        <DerivationModeDropdown value={mode} onChange={handleModeChange} />
        <FormFieldContainer
          className={classNames("mt-2", mode !== "custom" && "invisible")}
          error={errors.derivationPath?.message}
        >
          <FormFieldInputText
            {...register("derivationPath")}
            placeholder={type === "ethereum" ? "m/44'/60'/0'/0/0" : "//0"}
            spellCheck={false}
            autoComplete="off"
            className="font-mono"
            data-lpignore
          />
        </FormFieldContainer>
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
