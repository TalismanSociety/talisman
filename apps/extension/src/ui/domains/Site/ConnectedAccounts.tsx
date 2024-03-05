import { api } from "@ui/api"
import { useAccountsForSite } from "@ui/hooks/useAccountsForSite"
import { useAuthorisedSites } from "@ui/hooks/useAuthorisedSites"
import { useCurrentSite } from "@ui/hooks/useCurrentSite"
import { AccountJsonAny, AuthorizedSite } from "extension-core"
import { FC, Fragment, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { ConnectAccountsContainer } from "./ConnectAccountsContainer"
import { ConnectAccountToggleButtonRow } from "./ConnectAccountToggleButtonRow"

const SubAccounts: FC<{ site: AuthorizedSite | null }> = ({ site }) => {
  const { t } = useTranslation()
  const accounts = useAccountsForSite(site)

  const activeAccounts = useMemo(
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
          onClick={handleConnectAllClick}
        >
          {t("Connect All")}
        </button>
      </div>
      {activeAccounts.map(([acc, isConnected], idx) => (
        <Fragment key={acc.address}>
          {!!idx && <AccountSeparator />}
          <ConnectAccountToggleButtonRow
            account={acc}
            checked={isConnected}
            onClick={handleAccountClick(acc.address)}
          />
        </Fragment>
      ))}
    </>
  )
}

const AccountSeparator = () => <div className="bg-grey-800 mx-6 h-0.5"></div>

const EthAccounts: FC<{ site: AuthorizedSite | null }> = ({ site }) => {
  const accounts = useAccountsForSite(site)
  const activeAccounts = useMemo(
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
    [authorisedSites, currentSite?.id]
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
    </div>
  )
}
