import { useEffect, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"

import { ProviderType } from "@extension/core"
import { TALISMAN_WEB_APP_URL } from "@extension/shared"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { OptionSwitch } from "@talisman/components/OptionSwitch"
import { Spacer } from "@talisman/components/Spacer"
import { useAuthorisedSites } from "@ui/state"

import { AuthorizedSite } from "./AuthorisedSite"
import { AuthorisedSitesBatchActions } from "./AuthorisedSiteBatchActions"

export const AuthorisedSites = () => {
  const { t } = useTranslation("admin")
  const sites = useAuthorisedSites()
  const [providerType, setProviderType] = useState<ProviderType>("polkadot")

  const siteIds = useMemo(() => {
    if (!sites) return []
    return Object.keys(sites).filter((id: string) => {
      const site = sites[id]
      switch (providerType) {
        case "polkadot":
          return !!site.addresses
        case "ethereum":
          return !!site.ethAddresses
        default:
          return false
      }
    })
  }, [providerType, sites])

  const { hasPolkadotSites, hasEthereumSites } = useMemo(
    () => ({
      hasPolkadotSites: Object.values(sites).some((site) => !!site.addresses),
      hasEthereumSites: Object.values(sites).some((site) => !!site.ethAddresses),
    }),
    [sites],
  )

  const showBatchActions = useMemo(
    () =>
      (providerType === "polkadot" && hasPolkadotSites) ||
      (providerType === "ethereum" && hasEthereumSites),
    [hasEthereumSites, hasPolkadotSites, providerType],
  )

  useEffect(() => {
    //when forgetting last ethereum site, force switch to polkadot
    if (providerType === "ethereum" && !hasEthereumSites) setProviderType("polkadot")
  }, [hasEthereumSites, providerType])

  return (
    <>
      <HeaderBlock
        title={t("Connected Sites")}
        text={t("Manage the sites that have access to your accounts")}
      />
      <Spacer large />
      <div className="flex items-center justify-between">
        <div>
          {hasEthereumSites ? (
            <OptionSwitch
              options={[
                ["ethereum", t("Ethereum")],
                ["polkadot", t("Polkadot")],
              ]}
              className="text-xs [&>div]:h-full"
              defaultOption="ethereum"
              onChange={setProviderType}
            />
          ) : null}
        </div>
        {showBatchActions && <AuthorisedSitesBatchActions providerType={providerType} />}
      </div>
      <Spacer small />
      <div className="flex flex-col gap-4">
        {siteIds.map((id) => (
          <AuthorizedSite key={`${providerType}-${id}`} id={id} provider={providerType} />
        ))}
        {providerType === "polkadot" && !hasPolkadotSites && (
          <div className="bg-grey-850 text-body-secondary w-full rounded p-8">
            <Trans
              t={t}
              components={{
                Link: (
                  // eslint-disable-next-line jsx-a11y/anchor-has-content
                  <a
                    href={TALISMAN_WEB_APP_URL}
                    target="_blank"
                    className="text-grey-200 hover:text-body"
                  ></a>
                ),
              }}
              defaults="You haven't connected to any Polkadot sites yet. Why not start with <Link>Talisman Portal</Link>?"
            ></Trans>
          </div>
        )}
        {sites && !hasEthereumSites && providerType === "ethereum" && (
          // This should never be displayed unless we decide to display the provider switcher without check
          <div className="bg-grey-850 w-full rounded p-8">
            {t("You haven't connected to any Ethereum sites yet.")}
          </div>
        )}
      </div>
    </>
  )
}
