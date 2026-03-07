import type { Account } from "@core/domains/keyring/exports"
import type { ProviderType } from "@core/domains/sitesAuthorised/types"
import type { KnownRequestIdOnly } from "@core/libs/requests/types"
import { InfoIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { AppPill } from "@ui/components/AppPill"
import { Button } from "@ui/components/Button"
import { Drawer } from "@ui/components/Drawer"
import { notify } from "@ui/components/Notifications"
import { ConnectAccountsContainer } from "@ui/domains/Site/ConnectAccountsContainer"
import { ConnectAccountToggleButtonRow } from "@ui/domains/Site/ConnectAccountToggleButtonRow"
import { ConnectedAccountsPolkadot } from "@ui/domains/Site/ConnectedAccountsPolkadot"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useInjectableAccounts } from "@ui/hooks/useInjectableAccounts"
import { useRequest } from "@ui/state/requests"
import capitalize from "lodash-es/capitalize"
import { type FC, useCallback, useEffect, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import { PopupContent, PopupFooter, PopupHeader, PopupLayout } from "../Layout/PopupLayout"

const NoAccountWarning = ({
  onIgnoreClick,
  onAddAccountClick,
  type,
}: {
  type: ProviderType
  onIgnoreClick: () => void
  onAddAccountClick: () => void
}) => {
  const { t } = useTranslation()
  return (
    <Drawer isOpen anchor="bottom" containerId="main">
      <div className="flex flex-col gap-8 rounded-t-xl bg-grey-800 p-12">
        <div className="w-full text-center">
          <InfoIcon className="inline-block text-[4rem] text-primary-500" />
        </div>
        <p className="text-center text-body-secondary">
          <Trans
            t={t}
            defaults="This application requires a <br/><strong>{{type}} account</strong> to connect.<br/>Would you like to create or import one?"
            components={{ strong: <strong className="text-body" />, br: <br /> }}
            values={{ type: capitalize(type) }}
          />
        </p>
        <div className="mt-4 grid grid-cols-2 gap-8">
          <Button onClick={onIgnoreClick}>{t("No")}</Button>
          <Button primary onClick={onAddAccountClick}>
            {t("Yes")}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}

type ConnectComponent = FC<{
  siteUrl: string
  connected: string[]
  setConnected: (connected: string[]) => void
  onNoAccountClose: (navigateToAddAccount: boolean) => () => void
}>

export const Connect: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation()
  const { id } = useParams<"id">() as KnownRequestIdOnly<"auth">
  const authRequest = useRequest(id)
  const { popupOpenEvent } = useAnalytics()
  const [connected, setConnected] = useState<string[]>([])

  useEffect(() => {
    if (!authRequest) window.close()
  }, [authRequest])

  const authorise = useCallback(async () => {
    if (!authRequest) return
    try {
      await api.authrequestApprove(authRequest.id, connected)
      window.close()
    } catch (err) {
      notify({ type: "error", title: t("Failed to connect"), subtitle: (err as Error).message })
    }
  }, [authRequest, connected, t])

  const reject = useCallback(() => {
    if (!authRequest) return
    api.authrequestReject(authRequest.id)
    window.close()
  }, [authRequest])

  const ignore = useCallback(() => {
    if (!authRequest) return
    api.authrequestIgnore(authRequest.id)
    window.close()
  }, [authRequest])

  useEffect(() => {
    popupOpenEvent("connect")
  }, [popupOpenEvent])

  const onNoAccountClose = useCallback(
    (navigateToAddAccount: boolean) => () => {
      if (navigateToAddAccount) {
        api.dashboardOpen("/accounts/add")
        ignore()
      } else reject()
      window.close()
    },
    [ignore, reject]
  )

  if (!authRequest) return null

  const ConnectContentComponent: ConnectComponent = getConnectComponent(
    authRequest.request.provider
  )

  return (
    <PopupLayout className={className}>
      <PopupHeader>
        <AppPill url={authRequest.url} />
      </PopupHeader>
      <ConnectContentComponent
        siteUrl={authRequest.url}
        connected={connected}
        setConnected={setConnected}
        onNoAccountClose={onNoAccountClose}
      />

      <PopupFooter>
        <div className="grid w-full grid-cols-2 gap-12">
          <Button onClick={reject} data-testid="connection-reject-button">
            {t("Reject")}
          </Button>
          <Button
            primary
            onClick={authorise}
            disabled={connected.length <= 0}
            data-testid="connection-connect-button"
          >
            {t("Connect")} {connected.length > 0 && connected.length}
          </Button>
        </div>
      </PopupFooter>
    </PopupLayout>
  )
}
const getConnectComponent = (provider: ProviderType): ConnectComponent => {
  switch (provider) {
    case "polkadot":
      return ConnectPolkadot
    case "ethereum":
      return ConnectEth
    case "solana":
      return ConnectSolana
    default:
      throw new Error(`Unknown provider type: ${provider}`)
  }
}

const ConnectPolkadot: ConnectComponent = ({
  siteUrl,
  connected,
  setConnected,
  onNoAccountClose,
}) => {
  const { t } = useTranslation()

  const accounts = useInjectableAccounts(siteUrl, "polkadot")

  const activeAccounts = useMemo(
    () => accounts.map((acc) => [acc, connected.includes(acc.address)] as [Account, boolean]),
    [accounts, connected]
  )

  return (
    <PopupContent>
      <h3 className="mt-0 mb-6 pt-10 text-body-secondary text-sm">
        {t("Choose the account(s) you'd like to connect")}
      </h3>
      <section className="flex flex-col gap-4">
        <ConnectAccountsContainer
          status="disabled"
          connectedAddresses={connected}
          label={t("Substrate")}
          infoText={t(`Accounts will be connected via the Substrate provider`)}
          isSingleProvider
        >
          <ConnectedAccountsPolkadot
            activeAccounts={activeAccounts}
            onUpdateAccounts={setConnected}
          />
        </ConnectAccountsContainer>
        {!accounts.length && (
          <NoAccountWarning
            type={"polkadot"}
            onIgnoreClick={onNoAccountClose(false)}
            onAddAccountClick={onNoAccountClose(true)}
          />
        )}
      </section>
    </PopupContent>
  )
}

const ConnectEth: ConnectComponent = ({ siteUrl, connected, setConnected, onNoAccountClose }) => {
  const { t } = useTranslation()

  const accounts = useInjectableAccounts(siteUrl, "ethereum")

  return (
    <PopupContent>
      <h3 className="mt-0 mb-6 pt-10 text-body-secondary text-sm">
        {t("Choose the account you'd like to connect")}
      </h3>
      <section className="flex flex-col gap-4">
        <ConnectAccountsContainer
          status="disabled"
          connectedAddresses={connected}
          label={t("Ethereum")}
          infoText={t(`Accounts will be connected via the Ethereum provider`)}
          isSingleProvider
        >
          {accounts.map((account) => (
            <ConnectAccountToggleButtonRow
              key={account.address}
              account={account}
              checked={connected.includes(account?.address)}
              onClick={() => setConnected([account.address])}
            />
          ))}
        </ConnectAccountsContainer>
        {!accounts.length && (
          <NoAccountWarning
            type={"ethereum"}
            onIgnoreClick={onNoAccountClose(false)}
            onAddAccountClick={onNoAccountClose(true)}
          />
        )}
      </section>
    </PopupContent>
  )
}

const ConnectSolana: ConnectComponent = ({
  siteUrl,
  connected,
  setConnected,
  onNoAccountClose,
}) => {
  const { t } = useTranslation()

  const accounts = useInjectableAccounts(siteUrl, "solana")

  return (
    <PopupContent>
      <h3 className="mt-0 mb-6 pt-10 text-body-secondary text-sm">
        {t("Choose the account you'd like to connect")}
      </h3>
      <section className="flex flex-col gap-4">
        <ConnectAccountsContainer
          status="disabled"
          connectedAddresses={connected}
          label={t("Solana")}
          infoText={t(`Accounts will be connected via the Solana provider`)}
          isSingleProvider
        >
          {accounts.map((account) => (
            <ConnectAccountToggleButtonRow
              key={account.address}
              account={account}
              checked={connected.includes(account?.address)}
              onClick={() => setConnected([account.address])}
            />
          ))}
        </ConnectAccountsContainer>
        {!accounts.length && (
          <NoAccountWarning
            type={"solana"}
            onIgnoreClick={onNoAccountClose(false)}
            onAddAccountClick={onNoAccountClose(true)}
          />
        )}
      </section>
    </PopupContent>
  )
}
