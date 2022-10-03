import { ProviderType } from "@core/domains/sitesAuthorised/types"
import Field from "@talisman/components/Field"
import Panel from "@talisman/components/Panel"
import Spacer from "@talisman/components/Spacer"
import { WithTooltip } from "@talisman/components/Tooltip"
import Account from "@ui/domains/Account"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useAuthorisedSiteById from "@ui/hooks/useAuthorisedSiteById"
import useAuthorisedSiteProviders from "@ui/hooks/useAuthorisedSiteProviders"
import { useConnectedAccounts } from "@ui/hooks/useConnectedAccounts"
import { ChangeEventHandler, FC, useCallback, useEffect, useMemo, useState } from "react"
import styled from "styled-components"
import { Checkbox } from "talisman-ui"

import { NetworkSelect } from "../Ethereum/NetworkSelect"
import { ProviderTypeSwitch } from "./ProviderTypeSwitch"

const AccountItem = ({ address, value = false, onChange, className }: any) => (
  <Panel className={className} onClick={onChange} small>
    <Account.Name address={address} withAvatar />
    <Field.Checkbox value={value} small />
  </Panel>
)

const StyledAccountItem = styled(AccountItem)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
`

const Container = styled.div`
  background: var(--color-background);

  > div {
    display: flex;
    width: 100%;
  }

  h3 {
    text-align: left;
    margin: 0 0 1.6rem 0;
    flex-grow: 1;
    font-size: var(--font-size-small);
    line-height: 2rem;
    color: var(--color-foreground);
  }

  > section {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .account-name {
    overflow: hidden;
    text-overflow: ellipsis;
    padding-right: 0.8rem;
  }

  .dropdown > button {
    width: 100%;
  }
`

const Right = styled.div`
  display: flex;
  justify-content: flex-end;
  font-size: 1.2rem;
  line-height: 1.6rem;

  > div {
    padding: 0.2rem;
  }
`

type Props = {
  siteId: string
}

export const ConnectedAccounts: FC<Props> = ({ siteId }) => {
  const { genericEvent } = useAnalytics()
  const { authorizedProviders, defaultProvider } = useAuthorisedSiteProviders(siteId)
  const [providerType, setProviderType] = useState<ProviderType>(defaultProvider)
  const { accounts, showEthAccounts, setShowEthAccounts } = useConnectedAccounts(
    siteId,
    providerType
  )
  const { ethChainId, setEthChainId, url } = useAuthorisedSiteById(siteId, providerType)

  useEffect(() => {
    // reset if this info loads after render
    setProviderType(defaultProvider)
  }, [defaultProvider])

  const displayAccounts = useMemo(() => {}, [])

  const title = useMemo(() => {
    switch (providerType) {
      case "polkadot":
        return "Connected accounts"
      case "ethereum":
        return "Active account"
      default:
        throw new Error(`Unknown provider type: ${providerType}`)
    }
  }, [providerType])

  const handleShowEthAccountsChanged: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (!e.target.checked)
        for (const account of accounts.filter((a) => a.isConnected && a.type === "ethereum"))
          account.toggle()
      setShowEthAccounts(e.target.checked)
    },
    [accounts, setShowEthAccounts]
  )

  return (
    <Container>
      {authorizedProviders.length > 1 && (
        <Right>
          <ProviderTypeSwitch
            authorizedProviders={authorizedProviders}
            defaultProvider={defaultProvider}
            onChange={setProviderType}
          />
        </Right>
      )}
      {providerType === "ethereum" ? (
        <>
          <h3>Network</h3>
          <NetworkSelect
            defaultChainId={ethChainId}
            onChange={(chainId) => {
              genericEvent("evm network changed", { chainId, url })
              setEthChainId(chainId)
            }}
          />
          <Spacer small />
        </>
      ) : null}
      <div>
        <h3>{title}</h3>
      </div>
      {providerType === "polkadot" && (
        <div className="text-body-secondary my-4 text-sm">
          <WithTooltip tooltip="Some apps may not be compatible with ethereum accounts">
            <Checkbox onChange={handleShowEthAccountsChanged} defaultChecked={showEthAccounts}>
              Show Eth accounts
            </Checkbox>
          </WithTooltip>
        </div>
      )}
      <section className="accounts">
        {accounts?.map(({ address, isConnected, toggle }) => (
          <StyledAccountItem
            key={address}
            className={"account"}
            address={address}
            value={isConnected}
            onChange={toggle}
          />
        ))}
      </section>
    </Container>
  )
}
