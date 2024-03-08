import { AccountAddressType, RequestAccountCreateOptions } from "@extension/core"
import { AssetDiscoveryMode } from "@extension/core"
import { log } from "@extension/shared"
import { yupResolver } from "@hookform/resolvers/yup"
import { Accordion, AccordionIcon } from "@talisman/components/Accordion"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { Spacer } from "@talisman/components/Spacer"
import { ArrowRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { sleep } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import {
  MnemonicCreateModal,
  MnemonicCreateModalProvider,
  useMnemonicCreateModal,
} from "@ui/apps/dashboard/routes/Settings/Mnemonics/MnemonicCreateModal"
import { AccountTypeSelector } from "@ui/domains/Account/AccountTypeSelector"
import useAccounts from "@ui/hooks/useAccounts"
import { useMnemonics } from "@ui/hooks/useMnemonics"
import { FC, PropsWithChildren, useCallback, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import {
  Button,
  Checkbox,
  FormFieldContainer,
  FormFieldInputText,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useOpenClose,
} from "talisman-ui"
import * as yup from "yup"

import { AccountIcon } from "../../AccountIcon"
import { AccountAddPageProps } from "../types"
import { AccountAddMnemonicDropdown } from "./AccountAddMnemonicDropdown"

type FormData = {
  name: string
  type: AccountAddressType
  mnemonicId: string | null
  customDerivationPath: boolean
  derivationPath: string
}

const useNextAvailableDerivationPath = (mnemonicId: string | null, type: AccountAddressType) => {
  return useQuery({
    queryKey: ["useNextAvailableDerivationPath", mnemonicId, type],
    queryFn: () => {
      if (!mnemonicId || !type) return null
      return api.getNextDerivationPath(mnemonicId, type)
    },
    enabled: !!mnemonicId,
    refetchInterval: false,
    retry: false,
  })
}

const useLookupAddress = (
  mnemonicId: string | null,
  type: AccountAddressType,
  derivationPath: string | null | undefined
) => {
  return useQuery({
    queryKey: ["useLookupAddress", mnemonicId, derivationPath],
    queryFn: async () => {
      // empty string is valid
      if (!mnemonicId || !type || typeof derivationPath !== "string") return null
      if (!(await api.validateDerivationPath(derivationPath, type))) return null
      return api.addressLookup({ mnemonicId, type, derivationPath })
    },
    enabled: !!mnemonicId && type && typeof derivationPath === "string",
    refetchInterval: false,
    retry: false,
  })
}

const AdvancedSettings: FC<PropsWithChildren> = ({ children }) => {
  const { t } = useTranslation("admin")
  const { toggle, isOpen } = useOpenClose()

  return (
    <div className="h-[12rem]">
      <div className="text-right">
        <button
          type="button"
          className="text-body-disabled hover:text-body-secondary inline-flex items-center gap-0.5 whitespace-nowrap"
          onClick={toggle}
        >
          <div>{t("Advanced")}</div>
          <AccordionIcon isOpen={isOpen} />
        </button>
      </div>
      {/* enlarge the area or it would hide focus ring on the inputs */}
      <Accordion isOpen={isOpen} className={classNames(isOpen && "m-[-0.2rem] p-[0.2rem]")}>
        {children}
      </Accordion>
    </div>
  )
}

const AccountAddDerivedFormInner: FC<AccountAddPageProps> = ({ onSuccess }) => {
  const { t } = useTranslation("admin")
  // get type paramter from url
  const [params] = useSearchParams()
  const urlParamType = (params.get("type") ?? undefined) as AccountAddressType | undefined
  const mnemonics = useMnemonics()
  const allAccounts = useAccounts()
  const accountNames = useMemo(() => allAccounts.map((a) => a.name), [allAccounts])

  const schema = useMemo(
    () =>
      yup
        .object({
          name: yup.string().required("").notOneOf(accountNames, t("Name already in use")),
          type: yup.string().required("").oneOf(["ethereum", "sr25519"]),
          derivationPath: yup.string(),
        })
        .required()
        .test("validateDerivationPath", t("Invalid derivation path"), async (val, ctx) => {
          const { customDerivationPath, derivationPath, mnemonicId, type } = val as FormData
          if (!customDerivationPath) return true

          if (!(await api.validateDerivationPath(derivationPath, type)))
            return ctx.createError({
              path: "derivationPath",
              message: t("Invalid derivation path"),
            })

          if (mnemonicId) {
            const address = await api.addressLookup({ mnemonicId, derivationPath, type })
            if (allAccounts.some((a) => a.address === address))
              return ctx.createError({
                path: "derivationPath",
                message: t("Account already exists"),
              })
          }
          return true
        }),
    [accountNames, t, allAccounts]
  )

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
    defaultValues: { type: urlParamType, mnemonicId: mnemonics[0]?.id ?? null, derivationPath: "" },
  })

  const { generateMnemonic } = useMnemonicCreateModal()

  const submit = useCallback(
    async ({ name, type, mnemonicId, customDerivationPath, derivationPath }: FormData) => {
      let options: RequestAccountCreateOptions

      // note on derivation path :
      // undefined : backend will use next available derivation path
      // string : forces backend to use provided value, empty string being a valid derivation path

      if (mnemonicId === null) {
        const mnemonicOptions = await generateMnemonic()
        if (mnemonicOptions === null) return // cancelled
        options = {
          ...mnemonicOptions,
          derivationPath: customDerivationPath ? derivationPath : undefined,
        }
      } else {
        options = {
          mnemonicId, // undefined and empty strings should not be treated the same
          derivationPath: customDerivationPath ? derivationPath : undefined,
        }
      }

      const notificationId = notify(
        {
          type: "processing",
          title: t("Creating account"),
          subtitle: t("Please wait"),
        },
        { autoClose: false }
      )

      try {
        // pause to prevent double notification
        await sleep(1000)

        const address = await api.accountCreate(name, type, options)

        onSuccess(address)

        api.assetDiscoveryStartScan(AssetDiscoveryMode.ACTIVE_NETWORKS, [address])

        notifyUpdate(notificationId, {
          type: "success",
          title: t("Account created"),
          subtitle: name,
        })
      } catch (err) {
        log.error("Failed to create account", err)
        notifyUpdate(notificationId, {
          type: "error",
          title: t("Error creating account"),
          subtitle: (err as Error)?.message,
        })
      }
    },
    [generateMnemonic, onSuccess, t]
  )

  const handleTypeChange = useCallback(
    (type: AccountAddressType) => {
      setValue("type", type, { shouldValidate: true })
      setFocus("name")
    },
    [setFocus, setValue]
  )

  const handleMnemonicChange = useCallback(
    (mnemonicId: string | null) => {
      setValue("mnemonicId", mnemonicId, { shouldValidate: true })
    },
    [setValue]
  )

  const { type, mnemonicId, customDerivationPath, derivationPath } = watch()
  const { data: nextDerivationPath } = useNextAvailableDerivationPath(mnemonicId, type)
  const { data: address } = useLookupAddress(
    mnemonicId,
    type,
    customDerivationPath ? derivationPath : nextDerivationPath
  )

  useEffect(() => {
    // prefill custom derivation path with next available one
    if (nextDerivationPath === undefined || nextDerivationPath === null) return
    if (!customDerivationPath)
      setValue("derivationPath", nextDerivationPath, { shouldValidate: true })
  }, [customDerivationPath, nextDerivationPath, setValue])

  useEffect(() => {
    // if we have a type in the url, set it
    if (urlParamType) handleTypeChange(urlParamType)
  }, [urlParamType, handleTypeChange])

  return (
    <form onSubmit={handleSubmit(submit)}>
      <AccountTypeSelector defaultType={urlParamType} onChange={handleTypeChange} />
      <Spacer small />
      <div className={classNames("transition-opacity", type ? "opacity-100" : "opacity-0")}>
        {!!mnemonics.length && (
          <AccountAddMnemonicDropdown value={mnemonicId} onChange={handleMnemonicChange} />
        )}
        <FormFieldContainer className="mt-8" label={t("Account name")} error={errors.name?.message}>
          <FormFieldInputText
            {...register("name")}
            placeholder={t("Choose a name")}
            spellCheck={false}
            autoComplete="off"
            data-lpignore
            after={
              address ? (
                <Tooltip>
                  <TooltipTrigger>
                    <AccountIcon address={address} className="text-xl" />
                  </TooltipTrigger>
                  <TooltipContent>{address}</TooltipContent>
                </Tooltip>
              ) : null
            }
          />
        </FormFieldContainer>
        <Spacer small />
        <AdvancedSettings>
          <Checkbox
            {...register("customDerivationPath")}
            className="text-body-secondary hover:text-body-secondary"
          >
            {t("Custom derivation path")}
          </Checkbox>
          <FormFieldContainer
            className={classNames(
              "mt-2",
              !customDerivationPath && "block cursor-not-allowed select-none opacity-50"
            )}
            error={errors.derivationPath?.message}
          >
            <FormFieldInputText
              {...register("derivationPath")}
              placeholder={type === "ethereum" ? "m/44'/60'/0'/0/0" : "//0"}
              spellCheck={false}
              disabled={!customDerivationPath}
              autoComplete="off"
              className="font-mono disabled:cursor-not-allowed disabled:select-none"
              data-lpignore
            />
          </FormFieldContainer>
        </AdvancedSettings>
        <Spacer small />

        <div className="flex w-full items-center justify-end">
          <Button
            icon={ArrowRightIcon}
            type="submit"
            primary
            disabled={!isValid}
            processing={isSubmitting}
          >
            {t("Create")}
          </Button>
        </div>
      </div>
    </form>
  )
}

export const AccountAddDerivedForm: FC<AccountAddPageProps> = ({ onSuccess }) => {
  return (
    <MnemonicCreateModalProvider>
      <AccountAddDerivedFormInner onSuccess={onSuccess} />
      <MnemonicCreateModal />
    </MnemonicCreateModalProvider>
  )
}
