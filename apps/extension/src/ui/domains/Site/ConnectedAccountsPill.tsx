import { isAddressEqual } from "@talismn/crypto"
import { ChevronDownIcon } from "@talismn/icons"
import { classNames, isNotNil } from "@talismn/util"
import { Account } from "extension-core"
import { uniq } from "lodash-es"
import { FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import ConnectedAccountsDrawer from "@ui/domains/Site/ConnectedAccountsDrawer"
import { useCurrentSite } from "@ui/hooks/useCurrentSite"
import { useAccounts, useAuthorisedSites } from "@ui/state"

import { ConnectedSiteIndicator } from "./ConnectedSiteIndicator"

export const ConnectedAccountsPill: FC = () => {
  const { t } = useTranslation()
  const currentSite = useCurrentSite()
  const accounts = useAccounts("all")
  const authorisedSites = useAuthorisedSites()
  const site = useMemo(
    () => (currentSite?.id ? authorisedSites[currentSite?.id] : null),
    [authorisedSites, currentSite?.id],
  )

  const [showConnectedAccounts, setShowConnectedAccounts] = useState(false)

  const { count, label } = useMemo(() => {
    const { addresses = [], ethAddresses = [], solAddresses = [] } = site || {}
    const connected: Account[] = uniq([...addresses, ...ethAddresses, ...solAddresses])
      .map((a) => accounts.find(({ address }) => isAddressEqual(address, a)))
      .filter(isNotNil)

    if (connected.length === 0) return { count: 0, label: t("Not connected") }

    const count = connected.length
    const label =
      connected.length === 1
        ? (connected[0]?.name ?? t("Connected"))
        : t(`{{length}} connected`, { length: count })

    return { count, label }
  }, [accounts, site, t])

  const containerColors = useMemo(
    () =>
      count
        ? "bg-gradient-to-r from-green-500/50 to-grey-800"
        : "bg-gradient-to-r from-brand-orange/50 to-grey-800",
    [count],
  )

  const host = useMemo(() => {
    try {
      if (!currentSite.url) return null
      const typedUrl = new URL(currentSite.url)
      return typedUrl.hostname
    } catch (err) {
      return null
    }
  }, [currentSite.url])

  if (!site?.addresses && !site?.ethAddresses && !site?.solAddresses) return null

  return (
    <>
      <button
        type="button"
        className={classNames(
          "group h-[3.6rem] w-full overflow-hidden rounded-full p-0.5",
          containerColors,
          "text-body-secondary hover:text-grey-300",
        )}
        onClick={() => setShowConnectedAccounts(true)}
      >
        <div className="bg-grey-850 group-hover:bg-grey-800 flex h-full items-center gap-3 overflow-hidden rounded-full px-4">
          <ConnectedSiteIndicator status={count ? "connected" : "disconnected"} />
          <div className="flex grow items-center gap-3 truncate">
            <div className="text-body max-w-[50%] shrink-0 truncate text-sm">{label}</div>
            <div className="bg-grey-700 h-6 w-0.5 shrink-0"></div>
            <div className="text-body-secondary grow text-left text-xs">{host}</div>
          </div>
          <ChevronDownIcon className="shrink-0" />
        </div>
      </button>
      <ConnectedAccountsDrawer
        open={showConnectedAccounts}
        onClose={() => setShowConnectedAccounts(false)}
      />
    </>
  )
}
