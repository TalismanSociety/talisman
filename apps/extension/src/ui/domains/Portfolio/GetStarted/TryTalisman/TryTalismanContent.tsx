import { isAddressEqual, normalizeAddress } from "@talismn/crypto"
import { ArrowUpLeftIcon, CheckCircleIcon, LoaderIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { type AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { AddressFieldNsBadge } from "@ui/domains/Account/AddressFieldNsBadge"
import { useResolveNsName } from "@ui/hooks/useResolveNsName"
import { useAccounts } from "@ui/state/accounts"
import { classNames } from "@ui/util/cn"
import { IS_POPUP } from "@ui/util/constants"
import { shortenAddress } from "@ui/util/shortenAddress"
import {
  type ChangeEventHandler,
  type FC,
  type FormEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { useTryTalismanModal } from "./useTryTalismanModal"

const POPULAR_ACCOUNTS: Array<{ name?: string; address: string; description?: string }> = [
  { name: "Vitalik Buterin", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
  { name: "Mark Cuban", address: "0x95abda53bc5e9fbbdce34603614018d32ced219e" },
  { name: "Steve Aoki", address: "0xe4bBCbFf51e61D0D95FcC5016609aC8354B177C4" },
  { name: "sassal.eth", address: "0x648aA14e4424e0825A5cE739C8C68610e143FB79" },
  { name: "Bill Laboon", address: "5HjZCeVcUVpThHNMyMBMKqN5ajph9CkDmZhn9BK48TmC3K4Y" },
  { name: "Gavin Wood", address: "5F7LiCA6T4DWUDRQyFAWsRqVwxrJEznUtcw4WNnb5fe6snCH" },
]

export const TryTalismanContent: FC<{
  analytics: AnalyticsPage
}> = ({ analytics }) => {
  const { close } = useTryTalismanModal()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchAddress, setSearchAddress] = useState("")
  const [address, setAddress] = useState("")
  const [nsLookup, { nsLookupType, isNsLookup, isNsFetching }] = useResolveNsName(searchAddress)

  useEffect(() => {
    const isValidAddress = (() => {
      try {
        normalizeAddress(searchAddress)
        return true
      } catch {
        return false
      }
    })()
    const isValid = isNsLookup || isValidAddress

    // remove error before submission if address is valid
    if (isValid) setError(null)

    if (isNsLookup) {
      if (isNsFetching) return setAddress("")
      return setAddress(nsLookup ?? (nsLookup === null ? "invalid" : ""))
    }

    setAddress(searchAddress)
  }, [nsLookup, isNsFetching, isNsLookup, searchAddress])

  const onSubmit = useCallback<FormEventHandler>(
    async (event) => {
      event.preventDefault()

      setPending(true)

      sendAnalyticsEvent({
        ...analytics,
        name: "Interact",
        action: "Add watched account (custom)",
      })

      try {
        // throws if address is invalid
        normalizeAddress(address)

        const [resultAddress] = await api.accountAddExternal([
          {
            type: "watch-only",
            name: isNsLookup ? searchAddress : shortenAddress(address),
            address,
            isPortfolio: true,
          },
        ])

        setPending(false)
        setError(null)
        if (resultAddress) IS_POPUP ? navigate("/portfolio") : close()
      } catch {
        setPending(false)
        setError(t("Please enter a valid account address"))
      }
    },
    [analytics, address, isNsLookup, searchAddress, navigate, close, t]
  )
  const onInputChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    setSearchAddress(event.target.value)
  }, [])

  const allAccounts = useAccounts()
  const goToPortfolio = useCallback(() => {
    sendAnalyticsEvent({ ...analytics, name: "Goto", action: "Portfolio (added accounts)" })
    return IS_POPUP ? navigate("/portfolio") : close()
  }, [analytics, close, navigate])

  return (
    <div className="flex flex-col gap-12 pb-12 text-body-secondary text-sm">
      <div className="flex flex-col gap-8">
        <div className="px-16 text-center text-xs leading-paragraph">
          {t("Explore Talisman’s unique features without importing a recovery phrase")}
        </div>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="flex gap-4">
            <div className="relative w-full">
              <input
                type="text"
                className={classNames(
                  "w-full rounded bg-black-secondary px-8 py-6 text-body placeholder:text-body-disabled",
                  isNsLookup && "pr-16"
                )}
                placeholder={t("Enter any wallet address")}
                value={searchAddress}
                onChange={onInputChange}
              />
              <div className="absolute top-0 right-4 flex h-full items-center">
                <AddressFieldNsBadge
                  small
                  nsLookup={nsLookup}
                  nsLookupType={nsLookupType}
                  isNsLookup={isNsLookup}
                  isNsFetching={isNsFetching}
                />
              </div>
            </div>

            <button
              type="button"
              className={classNames(
                "rounded border border-body-disabled px-8 py-6 text-body-disabled",
                address.length && "border-primary bg-primary text-black hover:bg-primary/95"
              )}
              disabled={!address.length}
            >
              {pending ? <LoaderIcon className="animate-spin-slow" /> : t("Add")}
            </button>
          </div>
          {error && <div className="text-center text-alert-error text-tiny">{error}</div>}
        </form>
      </div>

      <div className="flex w-full items-center gap-10">
        <div className="h-px flex-1 bg-grey-700" />
        <div className="text-grey-500 text-tiny">
          {t("Or follow some of the most popular accounts")}
        </div>
        <div className="h-px flex-1 bg-grey-700" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {POPULAR_ACCOUNTS.map((account, index) => (
          <FollowAccountButton
            // biome-ignore lint/suspicious/noArrayIndexKey: legacy
            key={index}
            name={account.name}
            address={account.address}
            description={account.description}
            analytics={analytics}
          />
        ))}
      </div>

      {allAccounts.length > 0 && (
        <button type="button" className="flex flex-col items-center gap-3" onClick={goToPortfolio}>
          <div className="text-body-secondary text-xs">
            {allAccounts.length === 1
              ? t("{{number}} Account Added", { number: allAccounts.length })
              : t("{{number}} Accounts Added", { number: allAccounts.length })}
          </div>
          <div className="flex items-center gap-2 font-bold text-base text-primary">
            <ArrowUpLeftIcon className="text-lg" /> {t("View in Portfolio")}
          </div>
        </button>
      )}
    </div>
  )
}

const FollowAccountButton = ({
  name,
  address,
  description,
  analytics,
}: {
  name?: string
  address: string
  description?: string
  analytics: AnalyticsPage
}) => {
  const { t } = useTranslation()
  const allAccounts = useAccounts()

  const onClick = useCallback(async () => {
    sendAnalyticsEvent({
      ...analytics,
      name: "Interact",
      action: `Add watched account (${name ?? description ?? address})`,
    })

    await api.accountAddExternal([
      {
        type: "watch-only",
        name: name ?? shortenAddress(address),
        address,
        isPortfolio: true,
      },
    ])
  }, [address, analytics, description, name])

  const isAdded = useMemo(
    () => allAccounts.some((a) => isAddressEqual(a.address, address)),
    [allAccounts, address]
  )

  const content = (
    <>
      <AccountIcon className="text-xl" address={address} />
      <div className="flex flex-col gap-2">
        <div className="text-body text-sm">{name ?? <Address address={address} noTooltip />}</div>
        <div className="text-body-secondary text-xs">
          {description ?? <Address address={address} noTooltip />}
        </div>
      </div>
    </>
  )

  if (isAdded)
    return (
      <div className="pointer-events-none relative flex items-center gap-4 rounded border border-[#131313] bg-grey-900 p-8 text-start">
        {content}
        <div className="absolute top-0 left-0 flex h-full w-full items-center justify-center gap-6 rounded bg-[#131313] p-8 text-primary text-xs">
          <CheckCircleIcon className="text-sm" /> {t("Account Added")}
        </div>
      </div>
    )

  return (
    <button
      type="button"
      className="flex items-center gap-4 rounded border border-grey-900 bg-grey-900 p-8 text-start hover:border-grey-800 hover:bg-grey-800 focus:border-grey-800"
      onClick={onClick}
    >
      {content}
    </button>
  )
}
