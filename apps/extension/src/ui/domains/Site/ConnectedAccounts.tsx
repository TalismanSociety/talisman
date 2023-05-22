import { ProviderType } from "@core/domains/sitesAuthorised/types"
import Spacer from "@talisman/components/Spacer"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useAuthorisedSiteById from "@ui/hooks/useAuthorisedSiteById"
import useAuthorisedSiteProviders from "@ui/hooks/useAuthorisedSiteProviders"
import { useConnectedAccounts } from "@ui/hooks/useConnectedAccounts"
import {
  ChangeEventHandler,
  FC,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { Checkbox, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { NetworkSelect } from "../Ethereum/NetworkSelect"
import { ConnectAccountToggleButton } from "./ConnectAccountToggleButton"
import { ProviderTypeSwitch } from "./ProviderTypeSwitch"

const SectionTitle: FC<PropsWithChildren> = ({ children }) => {
  return <h3 className="mb-4 text-base">{children}</h3>
}

type ConnectedAccountsProps = {
  siteId: string
}

export const ConnectedAccounts: FC<ConnectedAccountsProps> = ({ siteId }) => {
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

  const title = useMemo(() => {
    switch (providerType) {
      case "polkadot":
        return "Active account(s)"
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
    <div>
      {authorizedProviders.length > 1 && (
        <div className="mb-12 flex w-full justify-end text-xs leading-8">
          <ProviderTypeSwitch
            authorizedProviders={authorizedProviders}
            defaultProvider={defaultProvider}
            onChange={setProviderType}
          />
        </div>
      )}
      {providerType === "ethereum" ? (
        <>
          <SectionTitle>Network</SectionTitle>
          <NetworkSelect
            className="!w-full [&>button]:!w-full"
            withTestnets
            defaultChainId={ethChainId.toString()}
            onChange={(chainId) => {
              genericEvent("evm network changed", { chainId, url })
              setEthChainId(parseInt(chainId, 10))
            }}
          />
          <Spacer small />
        </>
      ) : null}
      <div className="flex w-full justify-between">
        <SectionTitle>{title}</SectionTitle>
        {providerType === "polkadot" && (
          <Tooltip>
            <TooltipTrigger className="text-body-secondary mb-4 text-sm leading-10">
              <Checkbox onChange={handleShowEthAccountsChanged} defaultChecked={showEthAccounts}>
                Show Eth accounts
              </Checkbox>
            </TooltipTrigger>
            <TooltipContent>Some apps do not work with Ethereum accounts</TooltipContent>
          </Tooltip>
        )}
      </div>

      <section className="flex flex-col gap-4 pb-12">
        {accounts?.map(({ isConnected, toggle, ...account }) => (
          <ConnectAccountToggleButton
            key={account.address}
            className={"account"}
            account={account}
            value={isConnected}
            onChange={toggle}
          />
        ))}
      </section>
    </div>
  )
}
