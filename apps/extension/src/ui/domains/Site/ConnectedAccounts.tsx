import { AccountJsonAny } from "@core/domains/accounts/types"
import { AuthorizedSite, ProviderType } from "@core/domains/sitesAuthorised/types"
import { Accordion, AccordionIcon } from "@talisman/components/Accordion"
import { Spacer } from "@talisman/components/Spacer"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { AccountsStack } from "@ui/apps/dashboard/routes/Settings/Accounts/AccountIconsStack"
import { useCurrentSite } from "@ui/apps/popup/context/CurrentSiteContext"
import useAccounts from "@ui/hooks/useAccounts"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import useAuthorisedSiteById from "@ui/hooks/useAuthorisedSiteById"
import useAuthorisedSiteProviders from "@ui/hooks/useAuthorisedSiteProviders"
import { useAuthorisedSites } from "@ui/hooks/useAuthorisedSites"
import { useConnectedAccounts } from "@ui/hooks/useConnectedAccounts"
import { useResolveEnsName } from "@ui/hooks/useResolveEnsName"
import {
  ChangeEventHandler,
  FC,
  Fragment,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import { Checkbox, Tooltip, TooltipContent, TooltipTrigger, useOpenClose } from "talisman-ui"

import { AccountIcon } from "../Account/AccountIcon"
import { AccountTypeIcon } from "../Account/AccountTypeIcon"
import { Address } from "../Account/Address"
import { FormattedAddress } from "../Account/FormattedAddress"
import { NetworkSelect } from "../Ethereum/NetworkSelect"
import { ConnectAccountToggleButton } from "./ConnectAccountToggleButton"
import { ConnectedSiteIndicator } from "./ConnectedSiteIndicator"
import { ProviderTypeSwitch } from "./ProviderTypeSwitch"
import { SiteConnectionStatus } from "./types"

const SectionTitle: FC<PropsWithChildren> = ({ children }) => {
  return <h3 className="mb-4 text-base">{children}</h3>
}

type ConnectedAccountsProps = {
  siteId: string
}

const ConnectionStatusContainer: FC<{
  status: SiteConnectionStatus
  className?: string
  children: ReactNode
}> = ({ status, className, children }) => {
  const colors = useMemo(() => {
    switch (status) {
      case "connected":
        return "bg-gradient-to-r from-green-500/50 to-grey-800"
      case "disconnected":
        return "bg-gradient-to-r from-brand-orange/50 to-grey-800"
      case "disabled":
        return "bg-gradient-to-r from-grey-500/50 to-grey-800"
    }
  }, [status])

  return (
    <div className={classNames("rounded-sm p-0.5", colors)}>
      <div className={classNames("overflow-hidden rounded-sm", className)}>{children}</div>
    </div>
  )
}

const AccountsExpandedContainer: FC<{
  label: string
  connectedAddresses: string[]
  children: ReactNode
}> = ({ label, connectedAddresses, children }) => {
  const { t } = useTranslation()
  const accounts = useAccounts()

  const connectedAccounts = useMemo(() => {
    return accounts.filter((account) => connectedAddresses.includes(account.address))
  }, [accounts, connectedAddresses])

  return (
    <ConnectionStatusContainer
      status={connectedAccounts.length ? "connected" : "disconnected"}
      className="bg-black"
    >
      <div className="bg-grey-900 text-body-secondary hover:text-body  flex h-24 w-full items-center gap-6 px-6 text-left">
        <div className="flex w-12 shrink-0 justify-center">
          <ConnectedSiteIndicator
            status={connectedAccounts.length ? "connected" : "disconnected"}
          />
        </div>
        <div className="text-body grow ">{label}</div>
        {connectedAccounts.length > 1 && (
          <div className="flex items-center gap-2">
            <AccountsStack accounts={connectedAccounts} />
            <div className="text-body text-xs">
              {t("{{count}} connected", { count: connectedAccounts.length })}
            </div>
          </div>
        )}
        {connectedAccounts.length === 1 && (
          <FormattedAddress
            className="text-body text-xs"
            address={connectedAccounts[0].address}
            noTooltip
          />
        )}
        {!connectedAccounts.length && (
          <div className="text-body-disabled text-xs">{t("Not connected")}</div>
        )}
      </div>
      <div>{children}</div>
    </ConnectionStatusContainer>
  )
}

const AccountsAccordionContainer: FC<{
  label: string
  connectedAddresses: string[]
  children: ReactNode
}> = ({ label, connectedAddresses, children }) => {
  const { t } = useTranslation()
  const { isOpen, toggle } = useOpenClose()
  const accounts = useAccounts()

  const connectedAccounts = useMemo(() => {
    return accounts.filter((account) => connectedAddresses.includes(account.address))
  }, [accounts, connectedAddresses])

  return (
    <ConnectionStatusContainer
      status={connectedAccounts.length ? "connected" : "disconnected"}
      className="bg-black"
    >
      <button
        type="button"
        onClick={toggle}
        className="bg-grey-900 hover:bg-grey-800 text-body-secondary hover:text-body  flex h-24 w-full items-center gap-6 px-6 text-left"
      >
        <div className="flex w-12 shrink-0 justify-center">
          <ConnectedSiteIndicator
            status={connectedAccounts.length ? "connected" : "disconnected"}
          />
        </div>
        <div className="text-body grow ">{label}</div>
        {connectedAccounts.length > 1 && (
          <div className="flex items-center gap-2">
            <AccountsStack accounts={connectedAccounts} />
            <div className="text-body text-xs">
              {t("{{count}} connected", { count: connectedAccounts.length })}
            </div>
          </div>
        )}
        {connectedAccounts.length === 1 && (
          <FormattedAddress
            className="text-body text-xs"
            address={connectedAccounts[0].address}
            noTooltip
          />
        )}
        {!connectedAccounts.length && (
          <div className="text-body-disabled text-xs">{t("Not connected")}</div>
        )}
        <AccordionIcon isOpen={isOpen} />
      </button>
      <Accordion isOpen={isOpen}>{children}</Accordion>
    </ConnectionStatusContainer>
  )
}

const AccountsContainer: FC<{
  label: string
  connectedAddresses: string[]
  isSingleProvider?: boolean
  children: ReactNode
}> = ({ label, connectedAddresses, children, isSingleProvider }) => {
  const Container = isSingleProvider ? AccountsExpandedContainer : AccountsAccordionContainer

  return (
    <Container label={label} connectedAddresses={connectedAddresses}>
      {children}
    </Container>
  )
}

const AccountButton: FC<{
  account: AccountJsonAny
  showAddress?: boolean
  isConnected?: boolean
  onClick?: () => void
}> = ({ account, isConnected, onClick }) => {
  useResolveEnsName()

  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "hover:bg-field flex h-24 w-full shrink-0 items-center gap-6 px-6",
        !isConnected && "text-body-secondary"
      )}
    >
      <AccountIcon
        className="shrink-0 text-lg"
        address={account.address}
        genesisHash={account?.genesisHash}
      />
      <div className="truncate text-left text-sm">
        <Tooltip placement="bottom-start">
          <TooltipTrigger asChild>
            <span>
              {account?.name ?? (
                <Address address={account.address} startCharCount={8} endCharCount={8} noTooltip />
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <Address
              address={account.address}
              startCharCount={8}
              endCharCount={8}
              noTooltip
              noShorten
            />
          </TooltipContent>
        </Tooltip>
      </div>
      <AccountTypeIcon origin={account.origin} className="text-primary" />
      <div className="grow"></div>
      <div
        className={classNames(
          "mx-2 h-4 w-4 shrink-0 rounded-full",
          isConnected ? "bg-primary" : "bg-grey-700"
        )}
      ></div>
    </button>
  )
}

const SubAccounts: FC<{ site: AuthorizedSite | null }> = ({ site }) => {
  const { t } = useTranslation()
  const accounts = useAccounts("owned")
  const evmAccounts = useMemo(
    () =>
      accounts.map(
        (acc) => [acc, site?.addresses?.includes(acc.address)] as [AccountJsonAny, boolean]
      ),
    [accounts, site?.addresses]
  )

  const handleAccountClick = useCallback(
    (address: string) => () => {
      if (!site?.id) return
      const isConnected = site?.addresses?.includes(address)
      const current = site?.addresses ?? []
      const addresses = isConnected ? current?.filter((a) => a !== address) : [...current, address]
      api.authorizedSiteUpdate(site?.id, { addresses })
    },
    [site?.addresses, site?.id]
  )

  const handleDisconnectAllClick = useCallback(() => {
    if (!site?.id) return
    api.authorizedSiteUpdate(site?.id, { addresses: [] })
  }, [site?.id])

  const handleConnectAllClick = useCallback(() => {
    if (!site?.id) return
    api.authorizedSiteUpdate(site?.id, { addresses: accounts.map((a) => a.address) })
  }, [accounts, site?.id])

  return (
    <>
      <div className="mb-2 mt-6 flex w-full items-center justify-end gap-4 px-8 text-xs">
        <button
          type="button"
          className="text-body-secondary hover:text-grey-300"
          onClick={handleDisconnectAllClick}
        >
          {t("Disconnect All")}
        </button>
        <div className="bg-body-disabled h-[1rem] w-0.5 "></div>
        <button
          type="button"
          className="text-body-secondary hover:text-grey-300"
          text-body-secondary
          onClick={handleConnectAllClick}
        >
          {t("Connect All")}
        </button>
      </div>
      {evmAccounts.map(([acc, isConnected], idx) => (
        <Fragment key={acc.address}>
          {!!idx && <AccountSeparator />}
          <AccountButton
            account={acc}
            isConnected={isConnected}
            onClick={handleAccountClick(acc.address)}
          />
        </Fragment>
      ))}
    </>
  )
}

const AccountSeparator = () => <div className="bg-grey-800 mx-6 h-0.5"></div>

const EthAccounts: FC<{ site: AuthorizedSite | null }> = ({ site }) => {
  const accounts = useAccounts("owned")
  const evmAccounts = useMemo(
    () =>
      accounts
        .filter((acc) => acc.type === "ethereum")
        .map(
          (acc) => [acc, site?.ethAddresses?.includes(acc.address)] as [AccountJsonAny, boolean]
        ),
    [accounts, site?.ethAddresses]
  )

  const handleAccountClick = useCallback(
    (address: string) => async () => {
      if (!site?.id) return
      const isConnected = site?.ethAddresses?.includes(address)
      const ethAddresses = isConnected ? [] : [address]
      await api.authorizedSiteUpdate(site?.id, { ethAddresses })
    },
    [site?.ethAddresses, site?.id]
  )

  return (
    <>
      {evmAccounts.map(([acc, isConnected], idx) => (
        <Fragment key={acc.address}>
          {!!idx && <AccountSeparator />}
          <AccountButton
            account={acc}
            showAddress
            isConnected={isConnected}
            onClick={handleAccountClick(acc.address)}
          />
        </Fragment>
      ))}
    </>
  )
}

export const ConnectedAccounts: FC<ConnectedAccountsProps> = ({ siteId }) => {
  const { t } = useTranslation()
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
        return t("Active account(s)")
      case "ethereum":
        return t("Active account")
      default:
        throw new Error(`Unknown provider type: ${providerType}`)
    }
  }, [providerType, t])

  const handleShowEthAccountsChanged: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (!e.target.checked)
        for (const account of accounts.filter((a) => a.isConnected && a.type === "ethereum"))
          account.toggle()
      setShowEthAccounts(e.target.checked)
    },
    [accounts, setShowEthAccounts]
  )

  const currentSite = useCurrentSite()
  const authorisedSites = useAuthorisedSites()
  const site = useMemo(
    () => (currentSite?.id ? authorisedSites[currentSite?.id] : null),
    [authorisedSites, currentSite?.id]
  )

  if (Date.now())
    return (
      <div className="flex w-full flex-col gap-6 pb-12">
        <div className="text-body-secondary my-2 text-xs">
          {t("Select which account(s) to connect to")}{" "}
          <span className="text-body font-bold">{site?.id}</span>
        </div>
        {site?.ethAddresses && (
          <AccountsContainer
            label={t("Ethereum")}
            connectedAddresses={site.ethAddresses}
            isSingleProvider={!site.addresses}
          >
            <EthAccounts site={site} />
          </AccountsContainer>
        )}
        {site?.addresses && (
          <AccountsContainer
            label={t("Polkadot")}
            connectedAddresses={site.addresses}
            isSingleProvider={!site.ethAddresses}
          >
            <SubAccounts site={site} />
          </AccountsContainer>
        )}
      </div>
    )

  return (
    <div>
      {authorizedProviders.length > 1 && (
        <div className="mb-4 flex w-full justify-end text-xs ">
          <ProviderTypeSwitch
            authorizedProviders={authorizedProviders}
            defaultProvider={defaultProvider}
            onChange={setProviderType}
          />
        </div>
      )}
      {providerType === "ethereum" ? (
        <>
          <SectionTitle>{t("Network")}</SectionTitle>
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
                {t("Show Eth accounts")}
              </Checkbox>
            </TooltipTrigger>
            <TooltipContent>{t("Some apps do not work with Ethereum accounts")}</TooltipContent>
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
