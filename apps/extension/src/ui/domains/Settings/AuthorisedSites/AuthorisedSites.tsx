/** biome-ignore-all lint/a11y/useAnchorContent: legacy */

import type { ProviderType } from "@core/domains/sitesAuthorised/types"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { OptionSwitch } from "@talisman/components/OptionSwitch"
import { Spacer } from "@talisman/components/Spacer"
import { useAuthorisedSites } from "@ui/state/authorisedSites"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { AuthorizedSite } from "./AuthorisedSite"
import { AuthorisedSitesBatchActions } from "./AuthorisedSiteBatchActions"

export const AuthorisedSites = () => {
  const { t } = useTranslation()
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
        case "solana":
          return !!site.solAddresses
        default:
          return false
      }
    })
  }, [providerType, sites])

  const [hasPolkadotSites, hasEthereumSites, hasSolanaSites] = useMemo(
    () => [
      Object.values(sites).some((site) => !!site.addresses),
      Object.values(sites).some((site) => !!site.ethAddresses),
      Object.values(sites).some((site) => !!site.solAddresses),
    ],
    [sites]
  )

  const showBatchActions = useMemo(
    () =>
      (providerType === "polkadot" && hasPolkadotSites) ||
      (providerType === "ethereum" && hasEthereumSites) ||
      (providerType === "solana" && hasSolanaSites),

    [hasEthereumSites, hasPolkadotSites, hasSolanaSites, providerType]
  )

  return (
    <>
      <HeaderBlock
        title={t("Connected Sites")}
        text={t("Manage the sites that have access to your accounts")}
      />
      <Spacer large />
      <div className="flex items-center justify-between">
        <div>
          <OptionSwitch
            options={[
              ["ethereum", t("Ethereum")],
              ["polkadot", t("Substrate")],
              ["solana", t("Solana")],
            ]}
            className="text-xs [&>div]:h-full"
            defaultOption="ethereum"
            onChange={setProviderType}
          />
        </div>
        {showBatchActions && <AuthorisedSitesBatchActions providerType={providerType} />}
      </div>
      <Spacer small />
      <div className="flex flex-col gap-4">
        {siteIds.map((id) => (
          <AuthorizedSite key={`${providerType}-${id}`} id={id} provider={providerType} />
        ))}
        {providerType === "polkadot" && !hasPolkadotSites && (
          <div className="w-full rounded bg-grey-850 p-8 text-body-secondary">
            {t("You haven't connected to any Substrate sites yet.")}
          </div>
        )}
        {sites && !hasEthereumSites && providerType === "ethereum" && (
          // This should never be displayed unless we decide to display the provider switcher without check
          <div className="w-full rounded bg-grey-850 p-8 text-body-secondary">
            {t("You haven't connected to any Ethereum sites yet.")}
          </div>
        )}
        {sites && !hasSolanaSites && providerType === "solana" && (
          // This should never be displayed unless we decide to display the provider switcher without check
          <div className="w-full rounded bg-grey-850 p-8 text-body-secondary">
            {t("You haven't connected to any Solana sites yet.")}
          </div>
        )}
      </div>
    </>
  )
}
