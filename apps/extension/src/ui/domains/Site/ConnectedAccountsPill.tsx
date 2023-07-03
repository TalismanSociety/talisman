import { classNames } from "@talismn/util"
import { useCurrentSite } from "@ui/apps/popup/context/CurrentSiteContext"
import useAccounts from "@ui/hooks/useAccounts"
import { useAuthorisedSites } from "@ui/hooks/useAuthorisedSites"
import { FC, Suspense, lazy, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { NetworkLogo } from "../Ethereum/NetworkLogo"

const ConnectedAccountsDrawer = lazy(() => import("@ui/domains/Site/ConnectedAccountsDrawer"))

export const ConnectedAccountsPill: FC = () => {
  const { t } = useTranslation()
  const currentSite = useCurrentSite()
  const accounts = useAccounts()
  const authorisedSites = useAuthorisedSites()
  const site = useMemo(
    () => (currentSite?.id ? authorisedSites[currentSite?.id] : null),
    [authorisedSites, currentSite?.id]
  )

  const [showConnectedAccounts, setShowConnectedAccounts] = useState(false)

  const { count, label, ethChainId } = useMemo(() => {
    const { addresses = [], ethAddresses = [], ethChainId } = site || {}
    const connected = [...new Set([...addresses, ...ethAddresses])]

    //if addresses is undefined or has length of 0, site has not been marked as trusted by the user
    if (connected.length === 0) return { count: 0, label: t("Not connected"), ethChainId }

    const count = connected.filter((ca) => accounts.some(({ address }) => address === ca)).length
    const label =
      accounts.length === 1 && count === 1
        ? t("Connected")
        : t(`{{length}} connected`, { length: count })

    return { count, label, ethChainId }
  }, [accounts, site, t])

  if (!site) return null

  return (
    <>
      <button
        type="button"
        className="text-body-secondary bg-grey-800 hover:bg-grey-750 hover:text-grey-300 flex h-14 items-center gap-3 rounded-3xl px-4 text-sm"
        onClick={() => setShowConnectedAccounts(true)}
      >
        <div
          className={classNames(
            "h-6 w-6 rounded-full",
            count ? "bg-alert-success" : "bg-alert-error"
          )}
        ></div>
        <div>{label}</div>
        {typeof ethChainId === "number" && (
          <NetworkLogo className="text-base" ethChainId={ethChainId.toString()} />
        )}
      </button>
      <Suspense fallback={null}>
        <ConnectedAccountsDrawer
          open={showConnectedAccounts}
          onClose={() => setShowConnectedAccounts(false)}
        />
      </Suspense>
    </>
  )
}
