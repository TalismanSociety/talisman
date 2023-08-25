import {
  AccountAddressType,
  AccountJsonAny,
  RequestAccountCreateOptions,
} from "@core/domains/accounts/types"
import { log } from "@core/log"
import { yupResolver } from "@hookform/resolvers/yup"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { Spacer } from "@talisman/components/Spacer"
import { ArrowRightIcon, PlusIcon, SeedIcon } from "@talisman/theme/icons"
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
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import { Button, Dropdown, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

type MnemonicOption = {
  value: string
  label: string
  accounts?: AccountJsonAny[]
}

const GENERATE_MNEMONIC_OPTION = {
  value: "new",
  label: "Generate new recovery phrase",
  accountsCount: undefined,
}

type FormData = {
  name: string
  type: AccountAddressType
}

type AccountAddDerivedFormProps = {
  onSuccess: (address: string) => void
}

const AccountAddDerivedFormInner: FC<AccountAddDerivedFormProps> = ({ onSuccess }) => {
  const { t } = useTranslation("admin")
  // get type paramter from url
  const [params] = useSearchParams()
  const urlParamType = (params.get("type") ?? undefined) as AccountAddressType | undefined
  const allAccounts = useAccounts()
  const accountNames = useMemo(() => allAccounts.map((a) => a.name), [allAccounts])

  const schema = useMemo(
    () =>
      yup
        .object({
          name: yup.string().required("").notOneOf(accountNames, t("Name already in use")),
          type: yup.string().required("").oneOf(["ethereum", "sr25519"]),
        })
        .required(),

    [accountNames, t]
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
    defaultValues: { type: urlParamType },
  })

  const mnemonics = useMnemonics()
  const mnemonicOptions: MnemonicOption[] = useMemo(
    () => [
      ...mnemonics
        .map((m) => ({
          label: m.name,
          value: m.id,
          accounts: allAccounts.filter((a) => a.derivedMnemonicId === m.id),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      GENERATE_MNEMONIC_OPTION,
    ],
    [allAccounts, mnemonics]
  )
  const [selectedMnemonic, setSelectedMnemonic] = useState<MnemonicOption | null>(
    () => mnemonicOptions[0]
  )

  const { generateMnemonic } = useMnemonicCreateModal()

  const submit = useCallback(
    async ({ name, type }: FormData) => {
      if (!selectedMnemonic) return

      let options: RequestAccountCreateOptions

      if (selectedMnemonic.value === "new") {
        const mnemonicOptions = await generateMnemonic()
        if (mnemonicOptions === null) return // cancelled
        options = mnemonicOptions
      } else {
        options = { mnemonicId: selectedMnemonic.value }
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
    [generateMnemonic, onSuccess, selectedMnemonic, t]
  )

  const handleTypeChange = useCallback(
    (type: AccountAddressType) => {
      setValue("type", type, { shouldValidate: true })
      setFocus("name")
    },
    [setFocus, setValue]
  )

  const type = watch("type")

  useEffect(() => {
    // if we have a type in the url, set it
    if (urlParamType) handleTypeChange(urlParamType)
  }, [urlParamType, handleTypeChange])

  return (
    <form onSubmit={handleSubmit(submit)}>
      <AccountTypeSelector defaultType={urlParamType} onChange={handleTypeChange} />
      <Spacer small />
      <div className={classNames("transition-opacity", type ? "opacity-100" : "opacity-0")}>
        {mnemonicOptions.length > 1 && (
          <Dropdown
            className="mt-8 [&>label]:mb-4"
            items={mnemonicOptions}
            label={t("Recovery phrase")}
            propertyKey="value"
            renderItem={(o) => (
              // <div className="flex w-full items-center gap-6 overflow-hidden">
              //   <div className="bg-body/10 text-md rounded-full p-4">
              //     {o.value === "new" ? <PlusIcon /> : <SeedIcon />}
              //   </div>

              //   <div className="flex grow flex-col gap-1 overflow-hidden">
              //     <div className="truncate text-sm">{o.label}</div>
              //     {o.value !== "new" && (
              //       <div className="text-body-disabled flex items-center gap-2 truncate text-xs">
              //         {o.accounts && <AccountsStack accounts={o.accounts} />}
              //         <div>
              //           {t("used by {{count}} accounts", { count: o.accounts?.length ?? 0 })}
              //         </div>
              //       </div>
              //     )}
              //   </div>
              // </div>
              <div className="flex w-full items-center gap-6 overflow-hidden">
                <div className="bg-body/10 text-md rounded-full p-4">
                  {o.value === "new" ? <PlusIcon /> : <SeedIcon />}
                </div>
                <div className="grow truncate text-sm">{o.label}</div>
                {o.value !== "new" && (
                  <div className="text-body-disabled flex shrink-0 items-center gap-2 truncate text-xs">
                    {t("used by {{count}} accounts", { count: o.accounts?.length ?? 0 })}
                  </div>
                )}
              </div>
            )}
            value={selectedMnemonic}
            onChange={setSelectedMnemonic}
            buttonClassName="py-6 bg-field"
            optionClassName="py-4 bg-field"
          />
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
