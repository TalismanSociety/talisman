import { isAddressEqual } from "@talismn/crypto"
import { Account, AuthorizedSite } from "extension-core"
import { FC, Fragment, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { api } from "@ui/api"
import { useCurrentSite } from "@ui/hooks/useCurrentSite"
import { useInjectableAccounts } from "@ui/hooks/useInjectableAccounts"
import { useAuthorisedSites } from "@ui/state"

import { ConnectAccountsContainer } from "./ConnectAccountsContainer"
import { ConnectAccountToggleButtonRow } from "./ConnectAccountToggleButtonRow"
import { ConnectedAccountsPolkadot } from "./ConnectedAccountsPolkadot"

const isMatch = (acc: Account) => (address: string) => isAddressEqual(acc.address, address)

const SubAccounts: FC<{ site: AuthorizedSite }> = ({ site }) => {
  const accounts = useInjectableAccounts(site.url, "polkadot")

  // using a local state allows for optimistic updates
  const [activeAccounts, setActiveAccounts] = useState(() =>
    accounts.map((acc) => [acc, site.addresses?.some(isMatch(acc))] as [Account, boolean]),
  )

  const handleUpdateAccounts = useCallback(
    (addresses: string[]) => {
      setActiveAccounts(
        accounts.map((acc) => [acc, addresses.some(isMatch(acc))] as [Account, boolean]),
      )
      api.authorizedSiteUpdate(site.id, {
        addresses,
      })
    },
    [accounts, site.id],
  )

  return (
    <ConnectedAccountsPolkadot
      activeAccounts={activeAccounts}
      onUpdateAccounts={handleUpdateAccounts}
    />
  )
}

const AccountSeparator = () => <div className="bg-grey-800 mx-6 h-0.5"></div>

const EthAccounts: FC<{ site: AuthorizedSite | null }> = ({ site }) => {
  const accounts = useInjectableAccounts(site?.url ?? "", "ethereum")
  const activeAccounts = useMemo(
    () =>
      accounts.map((acc) => [acc, site?.ethAddresses?.some(isMatch(acc))] as [Account, boolean]),
    [accounts, site?.ethAddresses],
  )

  const handleAccountClick = useCallback(
    (address: string) => async () => {
      if (!site?.id) return
      const isConnected = site?.ethAddresses?.includes(address)
      const ethAddresses = isConnected ? [] : [address]
      await api.authorizedSiteUpdate(site?.id, { ethAddresses })
    },
    [site?.ethAddresses, site?.id],
  )

  return (
    <>
      {activeAccounts.map(([acc, isConnected], idx) => (
        <Fragment key={acc.address}>
          {!!idx && <AccountSeparator />}
          <ConnectAccountToggleButtonRow
            account={acc}
            showAddress
            checked={isConnected}
            onClick={handleAccountClick(acc.address)}
          />
        </Fragment>
      ))}
    </>
  )
}

const SolAccounts: FC<{ site: AuthorizedSite | null }> = ({ site }) => {
  const accounts = useInjectableAccounts(site?.url ?? "", "solana")
  const activeAccounts = useMemo(
    () =>
      accounts.map((acc) => [acc, site?.solAddresses?.some(isMatch(acc))] as [Account, boolean]),
    [accounts, site?.solAddresses],
  )

  const handleAccountClick = useCallback(
    (address: string) => async () => {
      if (!site?.id) return
      const isConnected = site?.solAddresses?.includes(address)
      const solAddresses = isConnected ? [] : [address]
      await api.authorizedSiteUpdate(site?.id, { solAddresses })
    },
    [site?.solAddresses, site?.id],
  )

  return (
    <>
      {activeAccounts.map(([acc, isConnected], idx) => (
        <Fragment key={acc.address}>
          {!!idx && <AccountSeparator />}
          <ConnectAccountToggleButtonRow
            account={acc}
            showAddress
            checked={isConnected}
            onClick={handleAccountClick(acc.address)}
          />
        </Fragment>
      ))}
    </>
  )
}

export const ConnectedAccounts: FC = () => {
  const { t } = useTranslation()

  const currentSite = useCurrentSite()
  const authorisedSites = useAuthorisedSites()
  const site = useMemo(
    () => (currentSite?.id ? authorisedSites[currentSite?.id] : null),
    [authorisedSites, currentSite?.id],
  )

  return (
    <div className="flex w-full flex-col gap-6 pb-12">
      <div className="text-body-secondary my-2 text-xs">
        {t("Select which account(s) to connect to")}{" "}
        <span className="text-body font-bold">{site?.id}</span>
      </div>
      {site?.ethAddresses && (
        <ConnectAccountsContainer
          label={t("Ethereum")}
          status={site.ethAddresses.length ? "connected" : "disconnected"}
          connectedAddresses={site.ethAddresses}
          isSingleProvider={!site.addresses}
          infoText={t("Account connected via the Ethereum provider")}
        >
          <EthAccounts site={site} />
        </ConnectAccountsContainer>
      )}
      {site?.addresses && (
        <ConnectAccountsContainer
          label={t("Polkadot")}
          status={site.addresses.length ? "connected" : "disconnected"}
          connectedAddresses={site.addresses}
          isSingleProvider={!site.ethAddresses}
          infoText={t("Accounts connected via the Polkadot provider")}
        >
          <SubAccounts site={site} />
        </ConnectAccountsContainer>
      )}
      {site?.solAddresses && (
        <ConnectAccountsContainer
          label={t("Solana")}
          status={site.solAddresses.length ? "connected" : "disconnected"}
          connectedAddresses={site.solAddresses}
          isSingleProvider
          infoText={t("Accounts connected via the Solana provider")}
        >
          <SolAccounts site={site} />
        </ConnectAccountsContainer>
      )}
    </div>
  )
}
