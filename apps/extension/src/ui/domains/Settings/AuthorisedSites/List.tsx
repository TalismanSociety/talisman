import styled from "styled-components"
import HeaderBlock from "@talisman/components/HeaderBlock"
import Spacer from "@talisman/components/Spacer"
import Panel from "@talisman/components/Panel"
import Grid from "@talisman/components/Grid"
import { useAuthorisedSites } from "@ui/hooks/useAuthorisedSites"
import Site from "./Site"
import { ProviderTypeSwitch } from "@ui/domains/Site/ProviderTypeSwitch"
import { useEffect, useMemo, useState } from "react"
import { ProviderType } from "@core/types"

const AuthorisedSitesList = ({ className }: any) => {
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
        title="Trusted Sites"
        text="Manage the sites that have access to your accounts"
      />
      <Spacer />
      {hasEthereumTrustedSites ? (
        <ProviderTypeSwitch defaultProvider="polkadot" onChange={setProviderType} />
      ) : null}
      <Spacer small />
      <Grid columns={1} gap="1.4rem">
        {siteIds.map((id) => (
          <Site key={`${providerType}-${id}`} id={id} provider={providerType} />
        ))}
        {!sites ||
          (Object.keys(sites).length === 0 && (
            <Panel>
              You haven't connected to any sites yet. Why not start with the{" "}
              <TSLink href="https://app.talisman.xyz" target="_blank" className="link">
                Talisman Web App
              </TSLink>
              ?
            </Panel>
          ))}
        {sites && !hasEthereumTrustedSites && providerType === "ethereum" && (
          // This should never be displayed unless we decide to display the provider switcher without check
          <Panel>You haven't connected to any Ethereum sites yet.</Panel>
        )}
      </Grid>
    </>
  )
}

const TSLink = styled.a`
  color: var(--color-primary);
`

export default AuthorisedSitesList
