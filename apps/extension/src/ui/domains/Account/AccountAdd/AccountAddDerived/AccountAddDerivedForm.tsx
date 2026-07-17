import { log } from "@common/log"
import {
  getDefaultCurveForAccountPlatform,
  getDerivationPathForCurve,
  SUPPORTED_ACCOUNT_PLATFORMS,
} from "@core/domains/accounts/helpers"
import type { RequestAddAccountDerive } from "@core/domains/accounts/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { type AccountPlatform, isValidDerivationPath, type KeypairCurve } from "@talismn/crypto"
import { ArrowRightIcon } from "@talismn/icons"
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@ui/api"
import {
  MnemonicCreateModal,
  MnemonicCreateModalProvider,
  useMnemonicCreateModal,
} from "@ui/apps/dashboard/routes/Settings/Mnemonics/MnemonicCreateModal"
import { Accordion, AccordionIcon } from "@ui/components/Accordion"
import { Button } from "@ui/components/Button"
import { Checkbox } from "@ui/components/Checkbox"
import { FormFieldContainer } from "@ui/components/FormFieldContainer"
import { FormFieldInputText } from "@ui/components/FormFieldInputText"
import { notify, notifyUpdate } from "@ui/components/Notifications"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountPlatformSelector } from "@ui/domains/Account/AccountPlatformSelector"
import { useDebouncedValue } from "@ui/hooks/useDebouncedValue"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useAccounts } from "@ui/state/accounts"
import { useMnemonics } from "@ui/state/mnemonics"
import { cn } from "@ui/util/cn"
import { type FC, type PropsWithChildren, useCallback, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import * as yup from "yup"
import { BackToAddAccountButton } from "../BackToAddAccountButton"
import type { AccountAddPageProps } from "../types"
import { AccountAddMnemonicDropdown } from "./AccountAddMnemonicDropdown"

const useNextAvailableDerivationPath = (
  mnemonicId: string | null,
  curve: KeypairCurve | undefined
) => {
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

// The full-form resolver (mode: "onChange") re-runs the derivation-path test on every
// keystroke of ANY field — including the account name. The result is deterministic per
// (curve, path), so cache the derive instead of re-running it each time.
const validDerivationPathCache = new Map<string, Promise<boolean>>()
const isValidDerivationPathCached = (derivationPath: string, curve: KeypairCurve) => {
  const key = `${curve}::${derivationPath}`
  let result = validDerivationPathCache.get(key)
  if (!result) {
    result = isValidDerivationPath(derivationPath, curve)
    validDerivationPathCache.set(key, result)
    // bound the cache; drops oldest first, a typing session only needs the newest entries
    if (validDerivationPathCache.size > 500)
      validDerivationPathCache.delete(validDerivationPathCache.keys().next().value as string)
  }
  return result
}

// shared by the display lookup (useLookupAddress) and the schema's account-already-exists
// check, so both hit the same react-query cache entry: one background derive per unique
// (mnemonicId, curve, path) instead of one per resolver run + one per render
const lookupAddressQueryOptions = (
  mnemonicId: string | null,
  curve: KeypairCurve | undefined,
  derivationPath: string | null | undefined
) =>
  queryOptions({
    queryKey: ["useLookupAddress", mnemonicId, curve, derivationPath],
    queryFn: async () => {
      // empty string is valid
      if (!mnemonicId || !curve || typeof derivationPath !== "string") return null
      if (!(await isValidDerivationPathCached(derivationPath, curve))) return null
      return api.addressLookup({ type: "mnemonicId", mnemonicId, curve, derivationPath })
    },
    // deterministic result for a given key: never refetch
    staleTime: Infinity,
    refetchInterval: false,
    retry: false,
  })

const useLookupAddress = (
  mnemonicId: string | null,
  curve: KeypairCurve | undefined,
  derivationPath: string | null | undefined
) => {
  return useQuery({
    ...lookupAddressQueryOptions(mnemonicId, curve, derivationPath),
    enabled: !!mnemonicId && curve && typeof derivationPath === "string",
  })
}

const AdvancedSettings: FC<PropsWithChildren> = ({ children }) => {
  const { t } = useTranslation()
  const { toggle, isOpen } = useOpenClose()

  return (
    <div className="h-60">
      <div className="text-right">
        <button
          type="button"
          className="inline-flex items-center gap-0.5 whitespace-nowrap text-body-disabled hover:text-body-secondary"
          onClick={toggle}
        >
          <div>{t("Advanced")}</div>
          <AccordionIcon isOpen={isOpen} />
        </button>
      </div>
      {/* enlarge the area or it would hide focus ring on the inputs */}
      <Accordion isOpen={isOpen} className={cn(isOpen && "-m-1 p-1")}>
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
  const queryClient = useQueryClient()

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
          // platform is not selected yet (form opened without a ?platform= url param)
          if (!platform) return true

          const curve = getDefaultCurveForAccountPlatform(platform)

          if (!(await isValidDerivationPathCached(derivationPath, curve)))
            return ctx.createError({
              path: "derivationPath",
              message: t("Invalid derivation path"),
            })

          if (mnemonicId) {
            // shares its cache entry with the display lookup below
            const address = await queryClient.fetchQuery(
              lookupAddressQueryOptions(mnemonicId, curve, derivationPath)
            )
            if (allAccounts.some((a) => a.address === address))
              return ctx.createError({
                path: "derivationPath",
                message: t("Account already exists"),
              })
          }
          return true
        }),
    [accountNames, t, allAccounts, queryClient]
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
        { autoClose: false }
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
    [generateMnemonic, onSuccess, t]
  )

  const handlePlatformChange = useCallback(
    (platform: AccountPlatform) => {
      setValue("platform", platform, { shouldValidate: true })
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

  const { platform, mnemonicId, isCustomDerivationPath, derivationPath } = watch()
  // platform is unset until the user picks one (the route can be opened without a
  // ?platform= url param, e.g. from the breadcrumb) — and the helper throws on undefined
  const curve = useMemo(
    () => (platform ? getDefaultCurveForAccountPlatform(platform) : undefined),
    [platform]
  )

  const { data: nextDerivationPath } = useNextAvailableDerivationPath(mnemonicId, curve)
  // debounced so the address preview doesn't trigger a background derive on every keystroke
  const lookupDerivationPath = useDebouncedValue(
    isCustomDerivationPath ? derivationPath : nextDerivationPath,
    200
  )
  const { data: address } = useLookupAddress(mnemonicId, curve, lookupDerivationPath)

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
          className={cn(
            "flex flex-col gap-8 transition-opacity",
            platform ? "opacity-100" : "opacity-0"
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
              className={cn(
                !isCustomDerivationPath && "block cursor-not-allowed select-none opacity-50"
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
