import { shortenAddress } from "@talisman/util/shortenAddress"
import { ArrowUpLeftIcon, CheckCircleIcon, ChevronLeftIcon, LoaderIcon } from "@talismn/icons"
import { classNames, encodeAnyAddress } from "@talismn/util"
import { api } from "@ui/api"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import useAccounts from "@ui/hooks/useAccounts"
import { ChangeEventHandler, FormEventHandler, useCallback, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Portfolio",
  featureVersion: 2,
  page: "Try Talisman",
}

const POPULAR_ACCOUNTS: Array<{ name?: string; address: string; description?: string }> = [
  { name: "Vitalik Buterin", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
  { name: "Mark Cuban", address: "0x95abda53bc5e9fbbdce34603614018d32ced219e" },
  { name: "Steve Aoki", address: "0xe4bBCbFf51e61D0D95FcC5016609aC8354B177C4" },
  { name: "sassal.eth", address: "0x648aA14e4424e0825A5cE739C8C68610e143FB79" },
  { name: "Bill Laboon", address: "5HjZCeVcUVpThHNMyMBMKqN5ajph9CkDmZhn9BK48TmC3K4Y" },
  { name: "Gavin Wood", address: "5F7LiCA6T4DWUDRQyFAWsRqVwxrJEznUtcw4WNnb5fe6snCH" },
]

export const PortfolioTryTalisman = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [address, setAddress] = useState("")
  const onSubmit = useCallback<FormEventHandler>(
    async (event) => {
      event.preventDefault()

      setPending(true)

      sendAnalyticsEvent({
        ...ANALYTICS_PAGE,
        name: "Interact",
        action: "Add watched account (custom)",
      })

      const isPortfolio = true

      try {
        // throws if address is invalid
        encodeAnyAddress(address)

        const resultAddress = await api.accountCreateWatched(
          shortenAddress(address),
          address,
          isPortfolio
        )

        setPending(false)
        setError(null)
        if (resultAddress) navigate("/portfolio")
      } catch {
        setPending(false)
        setError(t("Please enter a valid Polkadot or Ethereum address"))
      }
    },
    [t, address, navigate]
  )
  const onInputChange = useCallback<ChangeEventHandler<HTMLInputElement>>((event) => {
    const address = event.target.value
    const isValid = (() => {
      try {
        encodeAnyAddress(address)
        return true
      } catch {
        return false
      }
    })()

    // remove error before submission if address is valid
    if (isValid) setError(null)
    setAddress(event.target.value)
  }, [])

  const allAccounts = useAccounts()
  const goToPortfolio = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "Portfolio (added accounts)" })
    return navigate("/portfolio")
  }, [navigate])

  return (
    <div className="text-body-secondary flex flex-col gap-12 pb-12 text-sm">
      <div className="flex flex-col gap-8">
        <div className="leading-paragraph px-16 text-center text-xs">
          {t("Explore Talisman’s unique features without importing a recovery phrase")}
        </div>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="flex gap-4">
            <input
              type="text"
              className="bg-black-secondary text-body placeholder:text-body-disabled w-full rounded px-8 py-6"
              placeholder={t("Enter any wallet address")}
              value={address}
              onChange={onInputChange}
            />
            <button
              className={classNames(
                "text-body-disabled border-body-disabled rounded border px-8 py-6",
                address.length && "bg-primary border-primary hover:bg-primary/95 text-black"
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
        <div className="text-grey-500 text-tiny ">
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
}: {
  name?: string
  address: string
  description?: string
}) => {
  const { t } = useTranslation()
  const allAccounts = useAccounts()

  const onClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Interact",
      action: `Add watched account (${name ?? description ?? address})`,
    })

    const isPortfolio = true
    api.accountCreateWatched(name ?? shortenAddress(address), address, isPortfolio)
  }, [address, description, name])

  const isAdded = useMemo(
    () => allAccounts.some((a) => encodeAnyAddress(a.address) === encodeAnyAddress(address)),
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

export const PortfolioTryTalismanHeader = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const goToPortfolio = useCallback(() => {
    sendAnalyticsEvent({ ...ANALYTICS_PAGE, name: "Goto", action: "Portfolio (back)" })
    return navigate("/portfolio")
  }, [navigate])

  return (
    <header className="my-8 flex h-[3.6rem] w-full shrink-0 items-center justify-between gap-4 px-12">
      <div className="flex-1">
        <button type="button" className="p-6" onClick={goToPortfolio}>
          <ChevronLeftIcon />
        </button>
      </div>
      <div className="font-bold">
        <Trans t={t}>
          Try <span className="text-primary">Talisman</span>
        </Trans>
      </div>
      <div className="flex-1 text-right">
        <span />
      </div>
    </header>
  )
}
