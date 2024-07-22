import { InfoIcon } from "@talismn/icons"
import capitalize from "lodash/capitalize"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { Button, Drawer } from "talisman-ui"

import { AccountJsonAny, KnownRequestIdOnly, ProviderType } from "@extension/core"
import { AppPill } from "@talisman/components/AppPill"
import { notify } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import { ConnectAccountsContainer } from "@ui/domains/Site/ConnectAccountsContainer"
import { ConnectAccountToggleButtonRow } from "@ui/domains/Site/ConnectAccountToggleButtonRow"
import { ConnectedAccountsPolkadot } from "@ui/domains/Site/ConnectedAccountsPolkadot"
import { useAccountsForSite } from "@ui/hooks/useAccountsForSite"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useRequest } from "@ui/hooks/useRequest"

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
  const { t } = useTranslation("request")
  return (
    <Drawer isOpen anchor="bottom">
      <div className="bg-grey-800 flex flex-col gap-8 rounded-t-xl p-12">
        <div className="w-full text-center">
          <InfoIcon className="text-primary-500 inline-block text-[4rem]" />
        </div>
        <p className="text-body-secondary text-center">
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
  accounts: AccountJsonAny[]
  connected: string[]
  setConnected: (connected: string[]) => void
  onNoAccountClose: (navigateToAddAccount: boolean) => () => void
}>

export const Connect: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation("request")
  const { id } = useParams<"id">() as KnownRequestIdOnly<"auth">
  const authRequest = useRequest(id)
  const { popupOpenEvent } = useAnalytics()
  const allAccounts = useAccountsForSite(authRequest?.url ?? null)
  const [connected, setConnected] = useState<string[]>([])

  const ethereum = Boolean(authRequest?.request?.ethereum)

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

  const ConnectContentComponent: ConnectComponent = ethereum ? ConnectEth : ConnectPolkadot

  return (
    <PopupLayout className={className}>
      <PopupHeader>
        <AppPill url={authRequest.url} />
      </PopupHeader>
      <ConnectContentComponent
        accounts={allAccounts}
        connected={connected}
        setConnected={setConnected}
        onNoAccountClose={onNoAccountClose}
      />

      <PopupFooter>
        <div className="grid w-full grid-cols-2 gap-12">
          <Button onClick={reject}>{t("Reject")}</Button>
          <Button primary onClick={authorise} disabled={connected.length <= 0}>
            {t("Connect")} {connected.length > 0 && connected.length}
          </Button>
        </div>
      </PopupFooter>
    </PopupLayout>
  )
}

export const ConnectPolkadot: ConnectComponent = ({
  accounts,
  connected,
  setConnected,
  onNoAccountClose,
}) => {
  const { t } = useTranslation("request")

  const activeAccounts = useMemo(
    () =>
      accounts.map((acc) => [acc, connected.includes(acc.address)] as [AccountJsonAny, boolean]),
    [accounts, connected]
  )

  return (
    <PopupContent>
      <h3 className="text-body-secondary mb-6 mt-0 pt-10 text-sm">
        {t("Choose the account(s) you'd like to connect")}
      </h3>
      <section className="flex flex-col gap-4">
        <ConnectAccountsContainer
          status="disabled"
          connectedAddresses={connected}
          label={t("Polkadot")}
          infoText={t(`Accounts will be connected via the Polkadot provider`)}
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

export const ConnectEth: ConnectComponent = ({
  accounts,
  connected,
  setConnected,
  onNoAccountClose,
}) => {
  const { t } = useTranslation("request")

  const ethAccounts = useMemo(() => {
    return accounts.filter(({ type }) => type === "ethereum")
  }, [accounts])

  return (
    <PopupContent>
      <h3 className="text-body-secondary mb-6 mt-0 pt-10 text-sm">
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
          {ethAccounts.map((account) => (
            <ConnectAccountToggleButtonRow
              key={account.address}
              account={account}
              checked={connected.includes(account?.address)}
              onClick={() => setConnected([account.address])}
            />
          ))}
        </ConnectAccountsContainer>
        {!ethAccounts.length && (
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
