import { yupResolver } from "@hookform/resolvers/yup"
import { AccountPlatform, isAddressEqual } from "@talismn/crypto"
import { classNames, isTruthy } from "@talismn/util"
import {
  getDefaultCurveForAccountPlatform,
  getDerivationPathForCurve,
  getEthDerivationPath,
  SUPPORTED_ACCOUNT_PLATFORMS,
} from "extension-core"
import { DEBUG } from "extension-shared"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useForm, UseFormSetValue } from "react-hook-form"
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

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { Spacer } from "@talisman/components/Spacer"
import { api } from "@ui/api"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountPlatformSelector } from "@ui/domains/Account/AccountPlatformSelector"
import { useAccounts } from "@ui/state"

import { BackToAddAccountButton } from "../BackToAddAccountButton"
import { AccountAddDerivationMode, useAccountAddMnemonic } from "./context"
import { DerivationModeDropdown } from "./DerivationModeDropdown"

const cleanupMnemonic = (input = "") =>
  input
    .trim()
    .toLowerCase()
    .split(/[\s\r\n]+/g) //split on whitespace or carriage return
    .filter(isTruthy) //remove empty strings
    .join(" ")

type FormData = {
  name: string
  platform: AccountPlatform
  mnemonic: string
  mode: AccountAddDerivationMode
  derivationPath: string
}

export const AccountAddMnemonicForm = () => {
  const { t } = useTranslation()

  const { data, updateData, onSuccess } = useAccountAddMnemonic()
  const navigate = useNavigate()

  const allAccounts = useAccounts()
  const accountAddresses = useMemo(() => allAccounts.map((a) => a.address), [allAccounts])

  const schema = useMemo(
    () =>
      yup
        .object({
          name: yup.string().trim().required(" "),
          platform: yup.mixed<AccountPlatform>().oneOf(SUPPORTED_ACCOUNT_PLATFORMS).defined(),
          mode: yup
            .mixed<AccountAddDerivationMode>((v): v is AccountAddDerivationMode =>
              ["first", "custom", "multi"].includes(v),
            )
            .defined(),
          derivationPath: yup.string().defined().trim(),
          mnemonic: yup
            .string()
            .trim()
            .required(" ")
            .transform(cleanupMnemonic)
            .test("is-valid-mnemonic", t("Invalid recovery phrase"), async (val) =>
              api.validateMnemonic(val as string),
            ),
        })
        .required()
        .test("account-exists", t("Account exists"), async (val, ctx) => {
          const { mnemonic, platform, derivationPath, mode } = val as FormData
          if (!platform || !mnemonic) return false
          if (mode === "multi") return true

          const curve = getDefaultCurveForAccountPlatform(platform)
          if (!curve) return false

          let address: string
          try {
            address = await api.addressLookup({ type: "mnemonic", mnemonic, curve, derivationPath })
          } catch (err) {
            return ctx.createError({
              path: "derivationPath",
              message: t("Invalid derivation path"),
            })
          }

          if (accountAddresses.some((a) => isAddressEqual(a, address))) {
            return ctx.createError({
              path: mode === "custom" ? "derivationPath" : "mnemonic",
              message: t("Account already exists"),
            })
          }

          return true
        }),
    [accountAddresses, t],
  )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    defaultValues: data as FormData,
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const { platform, mnemonic, mode, derivationPath } = watch()
  const curve = useMemo(
    () => (platform ? getDefaultCurveForAccountPlatform(platform) : null),
    [platform],
  )

  const words = useMemo(
    () => cleanupMnemonic(mnemonic).split(" ").filter(isTruthy).length ?? 0,
    [mnemonic],
  )

  const [targetAddress, setTargetAddress] = useState<string>()

  useEffect(() => {
    const refreshTargetAddress = async () => {
      try {
        if (!curve) return setTargetAddress(undefined)

        setTargetAddress(
          await api.addressLookup({
            type: "mnemonic",
            mnemonic: cleanupMnemonic(mnemonic),
            derivationPath,
            curve,
          }),
        )
      } catch (err) {
        setTargetAddress(undefined)
      }
    }

    refreshTargetAddress()
  }, [derivationPath, isValid, mnemonic, curve])

  const submit = useCallback(
    async ({ platform, name, mnemonic, mode, derivationPath }: FormData) => {
      const curve = getDefaultCurveForAccountPlatform(platform)
      if (!curve) return

      updateData({ name, mnemonic, mode, derivationPath, curve })

      if (mode === "multi") navigate("multiple")
      else {
        const notificationId = notify(
          {
            type: "processing",
            title: t("Importing account"),
            subtitle: t("Please wait"),
          },
          { autoClose: false },
        )
        try {
          const [address] = await api.accountAddDerive([
            {
              type: "new-mnemonic",
              mnemonic,
              mnemonicName: `${name} Recovery Phrase`,
              confirmed: true,
              curve,
              derivationPath,
              name,
            },
          ])

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
    [updateData, navigate, t, onSuccess],
  )

  const handleTypeChange = useCallback(
    (platform: AccountPlatform) => {
      setValue("platform", platform, { shouldValidate: true })
      setValue(
        "derivationPath",
        platform === "ethereum"
          ? getEthDerivationPath()
          : getDerivationPathForCurve(getDefaultCurveForAccountPlatform(platform)),
        {
          shouldValidate: true,
        },
      )
    },
    [setValue],
  )

  const handleModeChange = useCallback(
    (mode: AccountAddDerivationMode) => {
      setValue("mode", mode, { shouldValidate: true })
      if (mode === "first")
        setValue(
          "derivationPath",
          platform === "ethereum"
            ? getEthDerivationPath()
            : getDerivationPathForCurve(getDefaultCurveForAccountPlatform(platform)),
          {
            shouldValidate: true,
          },
        )
    },
    [setValue, platform],
  )

  useEffect(() => {
    return () => {
      setValue("mnemonic", "")
    }
  }, [setValue])

  return (
    <div className="flex w-full flex-col gap-8">
      <HeaderBlock
        title={t("Import via Recovery Phrase")}
        text={t("What type of account would you like to import?")}
      />

      <AccountPlatformSelector defaultValue={platform} onChange={handleTypeChange} />

      <form onSubmit={handleSubmit(submit)}>
        <div className={classNames(!platform && "invisible")}>
          <FormFieldContainer error={errors.name?.message}>
            <FormFieldInputText
              {...register("name")}
              placeholder={t("Choose a name")}
              spellCheck={false}
              autoComplete="off"
              data-lpignore
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
          <FormFieldTextarea
            {...register("mnemonic")}
            placeholder={t("Enter your 12 or 24 word recovery phrase")}
            rows={5}
            data-lpignore
            spellCheck={false}
          />
          <div className="mt-2 flex w-full items-center justify-between gap-4 overflow-hidden text-xs">
            <div className="text-grey-600 shrink-0">{t("Word count: {{words}}", { words })}</div>
            <DevMnemonicButton setValue={setValue} />
            <div className="text-alert-warn grow truncate text-right">
              {errors.mnemonic?.message}
            </div>
          </div>
          <Spacer small />
          <DerivationModeDropdown value={mode} onChange={handleModeChange} />
          <FormFieldContainer
            className={classNames("mt-2", mode !== "custom" && "invisible")}
            error={errors.derivationPath?.message}
          >
            <FormFieldInputText
              {...register("derivationPath")}
              placeholder={platform === "ethereum" ? "m/44'/60'/0'/0/0" : "//0"}
              spellCheck={false}
              autoComplete="off"
              className="font-mono"
              data-lpignore
            />
          </FormFieldContainer>
          <Spacer small />
        </div>
        <div className="mt-1 flex w-full justify-between">
          <BackToAddAccountButton methodType="import" />
          <Button
            className="w-[24rem]"
            type="submit"
            primary
            disabled={!isValid}
            processing={isSubmitting}
            data-testid="account-add-mnemonic-import-button"
          >
            {t("Import")}
          </Button>
        </div>
      </form>
    </div>
  )
}

const DevMnemonicButton: FC<{ setValue: UseFormSetValue<FormData> }> = ({ setValue }) => {
  if (!DEBUG) return null

  return (
    <button
      type="button"
      onClick={() => {
        setValue("mnemonic", "test test test test test test test test test test test junk", {
          shouldValidate: true,
        })
      }}
    >
      Set dev mnemonic
    </button>
  )
}
