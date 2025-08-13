import { yupResolver } from "@hookform/resolvers/yup"
import { AccountPlatform, getAccountPlatformFromAddress } from "@talismn/crypto"
import { ArrowRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { SUPPORTED_ACCOUNT_PLATFORMS } from "extension-core"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import { Button, FormFieldContainer, FormFieldInputText, Toggle } from "talisman-ui"
import * as yup from "yup"

import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import { AccountAddPageProps } from "@ui/domains/Account/AccountAdd/types"
import { AccountPlatformSelector } from "@ui/domains/Account/AccountPlatformSelector"
import { AddressFieldNsBadge } from "@ui/domains/Account/AddressFieldNsBadge"
import { useResolveNsName } from "@ui/hooks/useResolveNsName"
import { useAccounts } from "@ui/state"

import { BackToAddAccountButton } from "./BackToAddAccountButton"

export const AccountAddWatchedForm = ({ onSuccess }: AccountAddPageProps) => {
  const { t } = useTranslation()
  // get type paramter from url
  const [params] = useSearchParams()
  const defaultPlatform = useMemo(() => {
    return (params.get("platform") ?? undefined) as AccountPlatform | undefined
  }, [params])

  const allAccounts = useAccounts()
  const accountNames = useMemo(() => allAccounts.map((a) => a.name), [allAccounts])

  const schema = useMemo(
    () =>
      yup
        .object({
          name: yup.string().required(" ").notOneOf(accountNames, t("Name already in use")),
          searchAddress: yup.string().trim().required(" "),
          platform: yup.mixed<AccountPlatform>().oneOf(SUPPORTED_ACCOUNT_PLATFORMS).defined(),
          address: yup.string().trim().required(" "),
          isPortfolio: yup.boolean().defined(),
        })
        .test("is-valid-address", t("Invalid address"), (val, ctx) => {
          const { platform, address } = val

          if (platform !== getAccountPlatformFromAddress(address))
            return ctx.createError({
              path: "address",
              message: t("Invalid address"),
            })

          return true
        })
        .required(),

    [accountNames, t],
  )

  type FormData = yup.InferType<typeof schema>

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    watch,
    trigger,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
    defaultValues: { platform: defaultPlatform },
  })

  const { platform, searchAddress } = watch()
  const [nsLookup, { nsLookupType, isNsLookup, isNsFetching }] = useResolveNsName(searchAddress)

  useEffect(() => {
    if (!isNsLookup) {
      setValue("address", searchAddress, { shouldValidate: true })
      return
    }

    if (isNsFetching) {
      // while querying NS service the address should be empty so form is invalid without displaying an error
      setValue("address", "", { shouldValidate: true })
    } else
      setValue("address", nsLookup ?? (nsLookup === null ? "invalid" : ""), {
        shouldValidate: true,
      })
  }, [nsLookup, isNsLookup, searchAddress, setValue, isNsFetching])

  const submit = useCallback(
    async ({ name, address, isPortfolio }: FormData) => {
      const notificationId = notify(
        {
          type: "processing",
          title: t("Adding account"),
          subtitle: t("Please wait"),
        },
        { autoClose: false },
      )

      try {
        const [addr] = await api.accountAddExternal([
          {
            type: "watch-only",
            name,
            address,
            isPortfolio,
          },
        ])

        onSuccess(addr)

        notifyUpdate(notificationId, {
          type: "success",
          title: t("Account added"),
          subtitle: name,
        })
      } catch (err) {
        notifyUpdate(notificationId, {
          type: "error",
          title: t("Error creating account"),
          subtitle: (err as Error)?.message,
        })
      }
    },
    [onSuccess, t],
  )

  const handlePlatformChange = useCallback(
    (platform: AccountPlatform) => {
      setValue("platform", platform, { shouldValidate: true })
      trigger()
    },
    [setValue, trigger],
  )

  const hasSetFocus = useRef(false)
  useEffect(() => {
    if (platform && !hasSetFocus.current) {
      setFocus("name")
      hasSetFocus.current = true
    }
  }, [setFocus, platform])

  useEffect(() => {
    // if we have a type in the url, set it
    if (defaultPlatform) handlePlatformChange(defaultPlatform)
  }, [defaultPlatform, handlePlatformChange])

  return (
    <form onSubmit={handleSubmit(submit)}>
      <div className="flex flex-col gap-16">
        {!defaultPlatform && (
          <AccountPlatformSelector defaultValue={platform} onChange={handlePlatformChange} />
        )}

        <div className={classNames("transition-opacity", platform ? "opacity-100" : "opacity-0")}>
          <div>
            <p className="text-body-secondary">
              {t("Please enter the name and the wallet address you'll be watching.")}
            </p>
            <p className="text-body-disabled text-xs">
              {t(
                "Note that the address will be watch-only and will not be able to sign transactions.",
              )}
            </p>
          </div>
          <div>
            <FormFieldContainer error={errors.name?.message}>
              <FormFieldInputText
                {...register("name")}
                placeholder={t("Choose a name")}
                spellCheck={false}
                autoComplete="off"
                data-lpignore
              />
            </FormFieldContainer>
            <FormFieldContainer error={errors.address?.message}>
              <FormFieldInputText
                {...register("searchAddress")}
                placeholder={t("Enter wallet address")}
                spellCheck={false}
                autoComplete="off"
                data-lpignore
                after={
                  <AddressFieldNsBadge
                    nsLookup={nsLookup}
                    nsLookupType={nsLookupType}
                    isNsLookup={isNsLookup}
                    isNsFetching={isNsFetching}
                  />
                }
              />
            </FormFieldContainer>
            <div className="bg-grey-850 mt-4 flex h-[58px] w-full items-center rounded px-12">
              <div className="grow space-y-4">
                <div className="text-body leading-none">{t("Include in my portfolio")}</div>
                <div className="text-body-disabled text-sm leading-none">
                  {t(
                    "If toggled on, this account's balances will be included in your Total Portfolio",
                  )}
                </div>
              </div>
              <Toggle {...register("isPortfolio")} />
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-between">
          <BackToAddAccountButton methodType="watched" />
          <Button
            icon={ArrowRightIcon}
            type="submit"
            primary
            disabled={!isValid}
            processing={isSubmitting}
          >
            {t("Add")}
          </Button>
        </div>
      </div>
    </form>
  )
}
