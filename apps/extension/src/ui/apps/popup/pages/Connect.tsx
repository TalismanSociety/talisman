import { ProviderType } from "@core/domains/sitesAuthorised/types"
import { KnownRequestIdOnly } from "@core/libs/requests/types"
import { AppPill } from "@talisman/components/AppPill"
import { notify } from "@talisman/components/Notifications"
import useSet from "@talisman/hooks/useSet"
import { InfoIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { ConnectAccountsContainer } from "@ui/domains/Site/ConnectAccountsContainer"
import { ConnectAccountToggleButtonRow } from "@ui/domains/Site/ConnectAccountToggleButtonRow"
import { useAccountsForSite } from "@ui/hooks/useAccountsForSite"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useRequest } from "@ui/hooks/useRequest"
import capitalize from "lodash/capitalize"
import { FC, useCallback, useEffect, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { Button, Drawer } from "talisman-ui"

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
            defaults="This application requires a <br/><strong>{{type}} account</strong> to connect.<br/>Would you like to create or import one ?"
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

export const Connect: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation("request")
  const { id } = useParams<"id">() as KnownRequestIdOnly<"auth">
  const authRequest = useRequest(id)
  const { popupOpenEvent } = useAnalytics()
  const allAccounts = useAccountsForSite(authRequest?.url ?? null)
  const { items: connected, toggle, set, clear } = useSet<string>()
  const ethereum = !!authRequest?.request?.ethereum

  const accounts = useMemo(() => {
    if (!authRequest || !allAccounts) return []

    // all accounts if polkadot, only ethereum accounts if ethereum
    return authRequest.request.ethereum
      ? allAccounts.filter(({ type }) => type === "ethereum")
      : allAccounts
  }, [allAccounts, authRequest])

  const handleToggle = useCallback(
    (address: string) => () => {
      ethereum ? set([address]) : toggle(address)
    },
    [ethereum, set, toggle]
  )

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

  const handleNoAccountClose = useCallback(
    (navigateToAddAccount: boolean) => () => {
      if (navigateToAddAccount) {
        api.dashboardOpen("/accounts/add")
        ignore()
      } else reject()
      window.close()
    },
    [ignore, reject]
  )

  const handleConnectAllClick = useCallback(() => {
    set(accounts.map((account) => account.address))
  }, [accounts, set])

  if (!authRequest) return null

  return (
    <PopupLayout className={className}>
      <PopupHeader>
        <AppPill url={authRequest.url} />
      </PopupHeader>
      <PopupContent>
        <h3 className="text-body-secondary mb-6 mt-0 pt-10 text-sm">
          {ethereum
            ? t("Choose the account you'd like to connect")
            : t("Choose the account(s) you'd like to connect")}
        </h3>
        <section className="flex flex-col gap-4">
          <ConnectAccountsContainer
            status="disabled"
            connectedAddresses={connected}
            label={ethereum ? t("Ethereum") : t("Polkadot")}
            infoText={t(`Accounts will be connected via the {{type}} provider`, {
              type: ethereum ? "Ethereum" : "Polkadot",
            })}
            isSingleProvider
          >
            {!ethereum && (
              <div className="mb-2 mt-6 flex w-full items-center justify-end gap-4 px-8 text-xs">
                <button
                  type="button"
                  className="text-body-secondary hover:text-grey-300"
                  onClick={clear}
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
            )}
            {accounts.map((account) => (
              <ConnectAccountToggleButtonRow
                key={account.address}
                account={account}
                checked={connected.includes(account?.address)}
                onClick={handleToggle(account.address)}
              />
            ))}
          </ConnectAccountsContainer>
          {!accounts.length && (
            <NoAccountWarning
              type={ethereum ? "ethereum" : "polkadot"}
              onIgnoreClick={handleNoAccountClose(false)}
              onAddAccountClick={handleNoAccountClose(true)}
            />
          )}
        </section>
      </PopupContent>
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
