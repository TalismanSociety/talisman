import { SUPPORTED_ACCOUNT_PLATFORMS } from "@core/domains/accounts/helpers"
import { yupResolver } from "@hookform/resolvers/yup"
import {
  type AccountPlatform,
  getAccountPlatformFromAddress,
  getXpubPrefix,
  isBitcoinXpub,
} from "@talismn/crypto"
import { ArrowRightIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { FormFieldContainer } from "@ui/components/FormFieldContainer"
import { FormFieldInputText } from "@ui/components/FormFieldInputText"
import { notify, notifyUpdate } from "@ui/components/Notifications"
import { Toggle } from "@ui/components/Toggle"
import type { AccountAddPageProps } from "@ui/domains/Account/AccountAdd/types"
import { AccountPlatformSelector } from "@ui/domains/Account/AccountPlatformSelector"
import { AddressFieldNsBadge } from "@ui/domains/Account/AddressFieldNsBadge"
import { useResolveNsName } from "@ui/hooks/useResolveNsName"
import { useAccounts } from "@ui/state/accounts"
import { cn } from "@ui/util/cn"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import * as yup from "yup"

import { BackToAddAccountButton } from "./BackToAddAccountButton"

type BitcoinAddressType = "p2wpkh" | "p2tr"

type BtcXpubKind =
  // script type is encoded in the SLIP-132 prefix (zpub/vpub)
  | { kind: "detected"; addressType: BitcoinAddressType }
  // plain xpub/tpub: could be a BIP84 or BIP86 account key — the user must choose
  | { kind: "ambiguous" }
  // ypub/upub: nested segwit trees are not tracked by this wallet
  | { kind: "unsupported" }

const getBtcXpubKind = (address: string): BtcXpubKind | null => {
  if (!isBitcoinXpub(address)) return null
  const prefix = getXpubPrefix(address)
  if (prefix === "zpub" || prefix === "vpub") return { kind: "detected", addressType: "p2wpkh" }
  if (prefix === "ypub" || prefix === "upub") return { kind: "unsupported" }
  return { kind: "ambiguous" }
}

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

          try {
            if (platform !== getAccountPlatformFromAddress(address))
              return ctx.createError({
                path: "address",
                message: t("Invalid address"),
              })

            // bitcoin accounts are watched by xpub: a single on-chain address cannot
            // track an HD wallet's balance
            if (platform === "bitcoin") {
              if (!isBitcoinXpub(address))
                return ctx.createError({
                  path: "address",
                  message: t("Enter an account xpub, not an address"),
                })
              if (getBtcXpubKind(address)?.kind === "unsupported")
                return ctx.createError({
                  path: "address",
                  message: t("Nested SegWit keys (ypub) are not supported"),
                })
            }
          } catch {
            return ctx.createError({
              path: "address",
              message: t("Invalid address"),
            })
          }

          return true
        })
        .required(),

    [accountNames, t]
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

  const { platform, searchAddress, address: watchedAddress } = watch()
  const [nsLookup, { nsLookupType, isNsLookup, isNsFetching }] = useResolveNsName(searchAddress)

  const btcXpubKind = useMemo(
    () => (platform === "bitcoin" && watchedAddress ? getBtcXpubKind(watchedAddress) : null),
    [platform, watchedAddress]
  )

  // user's script-type choice for ambiguous (plain xpub) keys, reset when the key
  // changes — the "previous value in state" adjust-during-render pattern, which stays
  // correct if a concurrent render is discarded (a ref mutation would not)
  const [btcAddressType, setBtcAddressType] = useState<BitcoinAddressType>("p2wpkh")
  const [prevAddress, setPrevAddress] = useState(watchedAddress)
  if (prevAddress !== watchedAddress) {
    setPrevAddress(watchedAddress)
    if (btcAddressType !== "p2wpkh") setBtcAddressType("p2wpkh")
  }

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
        { autoClose: false }
      )

      try {
        const kind = getBtcXpubKind(address)
        const [addr] = await api.accountAddExternal([
          kind
            ? {
                type: "watch-only-bitcoin",
                name,
                address,
                isPortfolio,
                // SLIP-132 prefix determines the script type; a plain xpub is
                // ambiguous (BIP84 vs BIP86) so the user picks in the form
                addressType: kind.kind === "detected" ? kind.addressType : btcAddressType,
              }
            : {
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
    [btcAddressType, onSuccess, t]
  )

  const handlePlatformChange = useCallback(
    (platform: AccountPlatform) => {
      setValue("platform", platform, { shouldValidate: true })
      trigger()
    },
    [setValue, trigger]
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

        <div className={cn("transition-opacity", platform ? "opacity-100" : "opacity-0")}>
          <div>
            <p className="text-body-secondary">
              {t("Please enter the name and the wallet address you'll be watching.")}
            </p>
            <p className="text-body-disabled text-xs">
              {t(
                "Note that the address will be watch-only and will not be able to sign transactions."
              )}
            </p>
            {platform === "bitcoin" && (
              <p className="text-body-disabled text-xs">
                {t(
                  "Bitcoin accounts are watched via their account xpub (zpub for Native SegWit, xpub for Taproot). One key tracks one address tree."
                )}
              </p>
            )}
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
            {btcXpubKind?.kind === "detected" && (
              <p className="mb-4 text-body-disabled text-xs">
                {t("Native SegWit key detected — bc1q addresses will be tracked.")}
              </p>
            )}
            {btcXpubKind?.kind === "ambiguous" && (
              <div className="mb-4 flex w-full flex-col gap-4 rounded bg-grey-850 p-8">
                <div className="text-body-secondary text-sm">
                  {t("This xpub doesn't specify an address type. Which one does it use?")}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {(
                    [
                      ["p2wpkh", t("Native SegWit"), "bc1q…"],
                      ["p2tr", t("Taproot"), "bc1p…"],
                    ] as const
                  ).map(([type, label, sample]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setBtcAddressType(type)}
                      className={cn(
                        "cursor-pointer rounded-sm border-none px-6 py-4 text-left outline-hidden",
                        btcAddressType === type
                          ? "bg-grey-700 text-body"
                          : "bg-grey-750 text-body-secondary hover:bg-grey-700"
                      )}
                    >
                      <div className="text-sm">{label}</div>
                      <div className="text-body-disabled text-xs">{sample}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 flex h-[58px] w-full items-center rounded bg-grey-850 px-12">
              <div className="grow space-y-4">
                <div className="text-body leading-none">{t("Include in my portfolio")}</div>
                <div className="text-body-disabled text-sm leading-none">
                  {t(
                    "If toggled on, this account's balances will be included in your Total Portfolio"
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
            data-testid="account-add-watched-button"
          >
            {t("Add")}
          </Button>
        </div>
      </div>
    </form>
  )
}
