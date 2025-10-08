import { yupResolver } from "@hookform/resolvers/yup"
import { AccountPlatform, isValidDerivationPath, KeypairCurve } from "@talismn/crypto"
import { ArrowRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import {
  getDefaultCurveForAccountPlatform,
  getDerivationPathForCurve,
  RequestAddAccountDerive,
  SUPPORTED_ACCOUNT_PLATFORMS,
} from "extension-core"
import { log } from "extension-shared"
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

import { Accordion, AccordionIcon } from "@talisman/components/Accordion"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import {
  MnemonicCreateModal,
  MnemonicCreateModalProvider,
  useMnemonicCreateModal,
} from "@ui/apps/dashboard/routes/Settings/Mnemonics/MnemonicCreateModal"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountPlatformSelector } from "@ui/domains/Account/AccountPlatformSelector"
import { useAccounts, useMnemonics } from "@ui/state"

import { BackToAddAccountButton } from "../BackToAddAccountButton"
import { AccountAddPageProps } from "../types"
import { AccountAddMnemonicDropdown } from "./AccountAddMnemonicDropdown"

const useNextAvailableDerivationPath = (mnemonicId: string | null, curve: KeypairCurve) => {
  return useQuery({
    queryKey: ["useNextAvailableDerivationPath", mnemonicId, curve],
    queryFn: () => {
      if (!curve) return null
      if (!mnemonicId) return getDerivationPathForCurve(curve)
      return api.getNextDerivationPath(mnemonicId, curve)
    },
    refetchInterval: false,
    retry: false,
  })
}

const useLookupAddress = (
  mnemonicId: string | null,
  curve: KeypairCurve,
  derivationPath: string | null | undefined,
) => {
  return useQuery({
    queryKey: ["useLookupAddress", mnemonicId, derivationPath],
    queryFn: async () => {
      // empty string is valid
      if (!mnemonicId || !curve || typeof derivationPath !== "string") return null
      if (!(await isValidDerivationPath(derivationPath, curve))) return null
      return api.addressLookup({ type: "mnemonicId", mnemonicId, curve, derivationPath })
    },
    enabled: !!mnemonicId && curve && typeof derivationPath === "string",
    refetchInterval: false,
    retry: false,
  })
}

const AdvancedSettings: FC<PropsWithChildren> = ({ children }) => {
  const { t } = useTranslation()
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
  const { t } = useTranslation()
  // get type paramter from url
  const [params] = useSearchParams()
  const defaultPlatform = useMemo(() => {
    // type is for legacy compatibility
    return (params.get("platform") ?? params.get("type") ?? undefined) as
      | AccountPlatform
      | undefined
  }, [params])

  const mnemonics = useMnemonics()
  const allAccounts = useAccounts()
  const accountNames = useMemo(() => allAccounts.map((a) => a.name), [allAccounts])

  const schema = useMemo(
    () =>
      yup
        .object({
          name: yup.string().required(" ").notOneOf(accountNames, t("Name already in use")),
          platform: yup.mixed<AccountPlatform>().oneOf(SUPPORTED_ACCOUNT_PLATFORMS).defined(),
          derivationPath: yup.string().defined(""),
          isCustomDerivationPath: yup.boolean(),
          mnemonicId: yup.string().defined().nullable(),
        })
        .required()
        .test("validateDerivationPath", t("Invalid derivation path"), async (val, ctx) => {
          const { isCustomDerivationPath, derivationPath, mnemonicId, platform } = val as FormData
          if (!isCustomDerivationPath) return true

          const curve = getDefaultCurveForAccountPlatform(platform)

          if (!(await isValidDerivationPath(derivationPath, curve)))
            return ctx.createError({
              path: "derivationPath",
              message: t("Invalid derivation path"),
            })

          if (mnemonicId) {
            const address = await api.addressLookup({
              type: "mnemonicId",
              mnemonicId,
              derivationPath,
              curve,
            })
            if (allAccounts.some((a) => a.address === address))
              return ctx.createError({
                path: "derivationPath",
                message: t("Account already exists"),
              })
          }
          return true
        }),
    [accountNames, t, allAccounts],
  )

  type FormData = yup.InferType<typeof schema>

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
    defaultValues: {
      platform: defaultPlatform,
      mnemonicId: mnemonics[0]?.id ?? null,
      derivationPath: "",
    },
  })

  const { generateMnemonic } = useMnemonicCreateModal()

  const submit = useCallback(
    async ({ name, platform, mnemonicId, derivationPath }: FormData) => {
      const curve = getDefaultCurveForAccountPlatform(platform)

      const mnemonicOptions = mnemonicId === null ? await generateMnemonic() : null
      if (mnemonicId === null && mnemonicOptions === null) return // user cancelled the wizard

      const option: RequestAddAccountDerive[number] = mnemonicOptions
        ? {
            type: "new-mnemonic",
            curve,
            mnemonic: mnemonicOptions.mnemonic,
            confirmed: mnemonicOptions.confirmed,
            derivationPath,
            name,
            mnemonicName: `${name} Recovery Phrase`,
          }
        : {
            type: "existing-mnemonic",
            mnemonicId: mnemonicId!,
            curve,
            derivationPath,
            name,
          }

      const notificationId = notify(
        {
          type: "processing",
          title: t("Creating account"),
          subtitle: t("Please wait"),
        },
        { autoClose: false },
      )

      try {
        const [address] = await api.accountAddDerive([option])

        onSuccess(address)

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
    [generateMnemonic, onSuccess, t],
  )

  const handlePlatformChange = useCallback(
    (platform: AccountPlatform) => {
      setValue("platform", platform, { shouldValidate: true })
      setFocus("name")
    },
    [setFocus, setValue],
  )

  const handleMnemonicChange = useCallback(
    (mnemonicId: string | null) => {
      setValue("mnemonicId", mnemonicId, { shouldValidate: true })
    },
    [setValue],
  )

  const { platform, mnemonicId, isCustomDerivationPath, derivationPath } = watch()
  const curve = useMemo(() => getDefaultCurveForAccountPlatform(platform), [platform])

  const { data: nextDerivationPath } = useNextAvailableDerivationPath(mnemonicId, curve)
  const { data: address } = useLookupAddress(
    mnemonicId,
    curve,
    isCustomDerivationPath ? derivationPath : nextDerivationPath,
  )

  useEffect(() => {
    // prefill custom derivation path with next available one
    if (nextDerivationPath === undefined || nextDerivationPath === null) return
    if (!isCustomDerivationPath)
      setValue("derivationPath", nextDerivationPath, { shouldValidate: true })
  }, [isCustomDerivationPath, nextDerivationPath, setValue])

  useEffect(() => {
    // if we have a type in the url, set it
    if (defaultPlatform) handlePlatformChange(defaultPlatform)
  }, [defaultPlatform, handlePlatformChange])

  return (
    <form onSubmit={handleSubmit(submit)}>
      <div className="flex flex-col gap-16">
        {!defaultPlatform && (
          <AccountPlatformSelector defaultValue={defaultPlatform} onChange={handlePlatformChange} />
        )}

        <div
          className={classNames(
            "flex flex-col gap-8 transition-opacity",
            platform ? "opacity-100" : "opacity-0",
          )}
        >
          {!!mnemonics.length && (
            <AccountAddMnemonicDropdown value={mnemonicId} onChange={handleMnemonicChange} />
          )}
          <FormFieldContainer label={t("Account name")} error={errors.name?.message}>
            <FormFieldInputText
              {...register("name")}
              placeholder={t("Choose a name")}
              spellCheck={false}
              autoComplete="off"
              data-lpignore
              after={
                address ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="size-16">
                        <AccountIcon address={address} className="text-xl" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{address}</TooltipContent>
                  </Tooltip>
                ) : null
              }
            />
          </FormFieldContainer>

          <AdvancedSettings>
            <Checkbox
              {...register("isCustomDerivationPath")}
              className="text-body-secondary hover:text-body-secondary"
            >
              {t("Custom derivation path")}
            </Checkbox>
            <FormFieldContainer
              className={classNames(
                !isCustomDerivationPath && "block cursor-not-allowed select-none opacity-50",
              )}
              error={errors.derivationPath?.message}
            >
              <FormFieldInputText
                {...register("derivationPath")}
                placeholder={curve === "ethereum" ? "m/44'/60'/0'/0/0" : "//0"}
                spellCheck={false}
                disabled={!isCustomDerivationPath}
                autoComplete="off"
                className="font-mono disabled:cursor-not-allowed disabled:select-none"
                data-lpignore
              />
            </FormFieldContainer>
          </AdvancedSettings>
        </div>

        <div className="flex w-full items-center justify-between">
          <BackToAddAccountButton />
          <Button
            icon={ArrowRightIcon}
            type="submit"
            primary
            disabled={!isValid}
            processing={isSubmitting}
            data-testid="account-add-new-account-button"
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
