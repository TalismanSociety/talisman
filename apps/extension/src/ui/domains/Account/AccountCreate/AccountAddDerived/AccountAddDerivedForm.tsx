import { AccountAddressType, RequestAccountCreateOptions } from "@core/domains/accounts/types"
import { log } from "@core/log"
import { yupResolver } from "@hookform/resolvers/yup"
import { Accordion, AccordionIcon } from "@talisman/components/Accordion"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { Spacer } from "@talisman/components/Spacer"
import { ArrowRightIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { sleep } from "@talismn/util"
import { api } from "@ui/api"
import { AccountTypeSelector } from "@ui/domains/Account/AccountTypeSelector"
import {
  MnemonicCreateModal,
  MnemonicCreateModalProvider,
  useMnemonicCreateModal,
} from "@ui/domains/Mnemonic/MnemonicCreateModal"
import useAccounts from "@ui/hooks/useAccounts"
import { useMnemonics } from "@ui/hooks/useMnemonics"
import { FC, PropsWithChildren, useCallback, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import { Button, Checkbox, FormFieldContainer, FormFieldInputText, useOpenClose } from "talisman-ui"
import * as yup from "yup"

import { AccountAddMnemonicDropdown } from "./AccountAddMnemonicDropdown"

type FormData = {
  name: string
  type: AccountAddressType
  mnemonicId: string | null
  customDerivationPath: boolean
  derivationPath: string
}

type AccountAddDerivedFormProps = {
  onSuccess: (address: string) => void
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
      {/* enlarge the area or it would hide focus ring on the textbox */}
      <Accordion isOpen={isOpen} className="mx-[-0.2rem] px-[0.2rem]">
        {children}
      </Accordion>
    </div>
  )
}

const AccountAddDerivedFormInner: FC<AccountAddDerivedFormProps> = ({ onSuccess }) => {
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

          if (derivationPath && !(await api.accountValidateDerivationPath(derivationPath)))
            return ctx.createError({
              path: "derivationPath",
              message: t("Invalid derivation path"),
            })

          if (mnemonicId) {
            const address = await api.accountAddressLookup({ mnemonicId, derivationPath, type })
            if (allAccounts.some((a) => a.address === address))
              return ctx.createError({
                path: "derivationPath",
                message: t("Address already exists"),
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

        onSuccess(await api.accountCreate(name, type, options))

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

  const { type, mnemonicId, customDerivationPath } = watch()

  useEffect(() => {
    // when customDerivationPath is checked, mark derivationPath as touched to trigger validation
    if (customDerivationPath)
      setValue("derivationPath", "", { shouldValidate: true, shouldTouch: true })
  }, [customDerivationPath, setValue])

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
              className="font-mono disabled:cursor-not-allowed disabled:select-none disabled:opacity-50"
              data-lpignore
            />
          </FormFieldContainer>
        </AdvancedSettings>
        <Spacer small />
        <div className="flex w-full justify-end">
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

export const AccountAddDerivedForm: FC<AccountAddDerivedFormProps> = ({ onSuccess }) => {
  return (
    <MnemonicCreateModalProvider>
      <AccountAddDerivedFormInner onSuccess={onSuccess} />
      <MnemonicCreateModal />
    </MnemonicCreateModalProvider>
  )
}
