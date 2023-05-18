import { ProviderType } from "@core/domains/sitesAuthorised/types"
import Field from "@talisman/components/Field"
import Spacer from "@talisman/components/Spacer"
import { classNames } from "@talismn/util"
import Account from "@ui/domains/Account"
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
import { ProviderTypeSwitch } from "./ProviderTypeSwitch"

const AccountItem: FC<{
  address: string
  value: boolean
  onChange: () => void
  className?: string
}> = ({ address, value = false, onChange }) => (
  <button
    type="button"
    className={classNames(
      "bg-black-secondary hover:bg-grey-800 flex h-28 w-full items-center justify-between rounded-sm px-8"
    )}
    onClick={onChange}
  >
    <Account.Name address={address} withAvatar />
    <Field.Checkbox value={value} small />
  </button>
)

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
        {accounts?.map(({ address, isConnected, toggle }) => (
          <AccountItem
            key={address}
            className={"account"}
            address={address}
            value={isConnected}
            onChange={toggle}
          />
        ))}
      </section>
    </div>
  )
}
