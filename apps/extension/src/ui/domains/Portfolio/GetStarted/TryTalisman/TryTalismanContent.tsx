import { isEthereumAddress } from "@polkadot/util-crypto"
import { ArrowUpLeftIcon, CheckCircleIcon, LoaderIcon } from "@talismn/icons"
import { classNames, encodeAnyAddress } from "@talismn/util"
import { AssetDiscoveryMode } from "extension-core"
import {
  ChangeEventHandler,
  FC,
  FormEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { shortenAddress } from "@talisman/util/shortenAddress"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { AddressFieldNsBadge } from "@ui/domains/Account/AddressFieldNsBadge"
import { useResolveNsName } from "@ui/hooks/useResolveNsName"
import { useAccounts } from "@ui/state"
import { IS_POPUP } from "@ui/util/constants"

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
        encodeAnyAddress(searchAddress)
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

      const isPortfolio = true

      try {
        // throws if address is invalid
        encodeAnyAddress(address)

        const resultAddress = await api.accountCreateWatched(
          isNsLookup ? searchAddress : shortenAddress(address),
          address,
          isPortfolio,
        )

        if (isEthereumAddress(resultAddress))
          api.assetDiscoveryStartScan(AssetDiscoveryMode.ACTIVE_NETWORKS, [resultAddress])

        setPending(false)
        setError(null)
        if (resultAddress) IS_POPUP ? navigate("/portfolio") : close()
      } catch {
        setPending(false)
        setError(t("Please enter a valid Polkadot or Ethereum address"))
      }
    },
    [analytics, address, isNsLookup, searchAddress, navigate, close, t],
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
    <div className="text-body-secondary flex flex-col gap-12 pb-12 text-sm">
      <div className="flex flex-col gap-8">
        <div className="leading-paragraph px-16 text-center text-xs">
          {t("Explore Talisman’s unique features without importing a recovery phrase")}
        </div>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="flex gap-4">
            <div className="relative w-full">
              <input
                type="text"
                className={classNames(
                  "bg-black-secondary text-body placeholder:text-body-disabled w-full rounded px-8 py-6",
                  isNsLookup && "pr-16",
                )}
                placeholder={t("Enter any wallet address")}
                value={searchAddress}
                onChange={onInputChange}
              />
              <div className="absolute right-4 top-0 flex h-full items-center">
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
              className={classNames(
                "text-body-disabled border-body-disabled rounded border px-8 py-6",
                address.length && "bg-primary border-primary hover:bg-primary/95 text-black",
              )}
              disabled={!address.length}
            >
              {pending ? <LoaderIcon className="animate-spin-slow" /> : t("Add")}
            </button>
          </div>
          {error && <div className="text-alert-error text-tiny text-center">{error}</div>}
        </form>
      </div>

      <div className="flex w-full items-center gap-10">
        <div className="bg-grey-700 h-[1px] flex-1" />
        <div className="text-grey-500 text-tiny">
          {t("Or follow some of the most popular accounts")}
        </div>
        <div className="bg-grey-700 h-[1px] flex-1" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {POPULAR_ACCOUNTS.map((account, index) => (
          <FollowAccountButton
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
          <div className="text-primary flex items-center gap-2 text-base font-bold">
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

    const isPortfolio = true
    const resultAddress = await api.accountCreateWatched(
      name ?? shortenAddress(address),
      address,
      isPortfolio,
    )

    if (isEthereumAddress(resultAddress))
      api.assetDiscoveryStartScan(AssetDiscoveryMode.ACTIVE_NETWORKS, [resultAddress])
  }, [address, analytics, description, name])

  const isAdded = useMemo(
    () => allAccounts.some((a) => encodeAnyAddress(a.address) === encodeAnyAddress(address)),
    [allAccounts, address],
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
      <div className="bg-grey-900 pointer-events-none relative flex items-center gap-4 rounded border border-[#131313] p-8 text-start">
        {content}
        <div className="text-primary absolute left-0 top-0 flex h-full w-full items-center justify-center gap-6 rounded bg-[#131313] p-8 text-xs">
          <CheckCircleIcon className="text-sm" /> {t("Account Added")}
        </div>
      </div>
    )

  return (
    <button
      type="button"
      className="bg-grey-900 hover:bg-grey-800 hover:border-grey-800 focus:border-grey-800 border-grey-900 flex items-center gap-4 rounded border p-8 text-start"
      onClick={onClick}
    >
      {content}
    </button>
  )
}
