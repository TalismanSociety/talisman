import { ProviderType } from "@core/domains/sitesAuthorised/types"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import Panel from "@talisman/components/Panel"
import { Spacer } from "@talisman/components/Spacer"
import { ProviderTypeSwitch } from "@ui/domains/Site/ProviderTypeSwitch"
import { useAuthorisedSites } from "@ui/hooks/useAuthorisedSites"
import { useEffect, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"

import { AuthorizedSite } from "./AuthorisedSite"

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

  const hasEthereumTrustedSites = useMemo(() => {
    if (!sites) return false
    return Object.keys(sites).some((id: string) => {
      const site = sites[id]
      return !!site.ethAddresses
    })
  }, [sites])

  useEffect(() => {
    //when forgetting last ethereum site, force switch to polkadot
    if (providerType === "ethereum" && !hasEthereumTrustedSites) setProviderType("polkadot")
  }, [hasEthereumTrustedSites, providerType])

  return (
    <>
      <HeaderBlock
        title={t("Trusted Sites")}
        text={t("Manage the sites that have access to your accounts")}
      />
      {hasEthereumTrustedSites ? (
        <ProviderTypeSwitch defaultProvider="polkadot" onChange={setProviderType} />
      ) : null}
      <Spacer small />
      <div className="flex flex-col gap-7">
        {siteIds.map((id) => (
          <AuthorizedSite key={`${providerType}-${id}`} id={id} provider={providerType} />
        ))}
        {!sites ||
          (Object.keys(sites).length === 0 && (
            <Panel>
              <Trans t={t}>
                You haven't connected to any sites yet. Why not start with the{" "}
                <a href="https://app.talisman.xyz" target="_blank" className="text-primary">
                  Talisman Web App
                </a>
                ?
              </Trans>
            </Panel>
          ))}
        {sites && !hasEthereumTrustedSites && providerType === "ethereum" && (
          // This should never be displayed unless we decide to display the provider switcher without check
          <Panel>{t("You haven't connected to any Ethereum sites yet.")}</Panel>
        )}
      </div>
    </>
  )
}