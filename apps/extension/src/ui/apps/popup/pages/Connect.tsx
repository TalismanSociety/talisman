import { KnownRequestIdOnly } from "@core/libs/requests/types"
import { AppPill } from "@talisman/components/AppPill"
import { IconButton } from "@talisman/components/IconButton"
import { notify } from "@talisman/components/Notifications"
import useSet from "@talisman/hooks/useSet"
import { InfoIcon, XIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import { ConnectAccountToggleButton } from "@ui/domains/Site/ConnectAccountToggleButton"
import useAccounts from "@ui/hooks/useAccounts"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useRequest } from "@ui/hooks/useRequest"
import { ChangeEventHandler, FC, useCallback, useEffect, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { Button, Drawer, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"
import { Checkbox } from "talisman-ui"

import Layout, { Content, Footer, Header } from "../Layout"

const NoEthAccountWarning = ({
  onIgnoreClick,
  onAddAccountClick,
}: {
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
          <Trans t={t}>
            This application requires an <br />
            <strong className="text-body">Ethereum account</strong> to connect.
            <br />
            Would you like to create or import one ?
          </Trans>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-8">
          <Button onClick={onIgnoreClick}>No</Button>
          <Button primary onClick={onAddAccountClick}>
            Yes
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
  const allAccounts = useAccounts()
  const { items: connected, toggle, set } = useSet<string>()
  const ethereum = !!authRequest?.request?.ethereum
  const [showEthAccounts, setShowEthAccounts] = useState(false)

  const accounts = useMemo(
    () =>
      authRequest && allAccounts
        ? allAccounts
            .filter(({ origin }) => origin !== "WATCHED")
            .filter(
              ({ type }) =>
                showEthAccounts ||
                (authRequest.request.ethereum ? type === "ethereum" : type !== "ethereum")
            )
        : [],
    [allAccounts, authRequest, showEthAccounts]
  )

  const handleToggle = useCallback(
    (address: string) => () => {
      ethereum ? set([address]) : toggle(address)
    },
    [ethereum, set, toggle]
  )

  const isMissingEthAccount = useMemo(
    () => ethereum && !!allAccounts.length && !accounts.length,
    [accounts.length, allAccounts.length, ethereum]
  )
  const canIgnore = useMemo(() => !authRequest?.request?.ethereum, [authRequest])

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

  const handleNoEthAccountClose = useCallback(
    (navigateToAddAccount: boolean) => () => {
      if (navigateToAddAccount) {
        api.dashboardOpen("/accounts/add")
        ignore()
      } else reject()
      window.close()
    },
    [ignore, reject]
  )

  const handleShowEthAccountsChanged: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (!e.target.checked)
        for (const account of accounts.filter(
          (a) => connected.includes(a.address) && a.type === "ethereum"
        ))
          toggle(account.address)
      setShowEthAccounts(e.target.checked)
    },
    [accounts, connected, toggle]
  )

  if (!authRequest) return null

  return (
    <Layout className={className}>
      <Header
        text={<AppPill url={authRequest.url} />}
        nav={
          <IconButton onClick={canIgnore ? ignore : reject}>
            <XIcon />
          </IconButton>
        }
      />

      <Content>
        <h3 className="mb-12 mt-0 pt-10 text-center text-sm font-bold">
          {ethereum
            ? t("Choose the account you'd like to connect")
            : t("Choose the account(s) you'd like to connect")}
        </h3>
        {!ethereum && (
          <div className="text-body-secondary my-4 text-sm">
            <Tooltip>
              <TooltipTrigger className="text-body-secondary mb-4 text-sm leading-10">
                <Checkbox onChange={handleShowEthAccountsChanged} defaultChecked={showEthAccounts}>
                  {t("Show Eth accounts")}
                </Checkbox>
              </TooltipTrigger>
              <TooltipContent>{t("Some apps do not work with Ethereum accounts")}</TooltipContent>
            </Tooltip>
          </div>
        )}
        <section className="flex flex-col gap-4">
          {accounts.map((account) => (
            <ConnectAccountToggleButton
              key={account.address}
              account={account}
              value={connected.includes(account?.address)}
              onChange={handleToggle(account.address)}
            />
          ))}

          {isMissingEthAccount && (
            <NoEthAccountWarning
              onIgnoreClick={handleNoEthAccountClose(false)}
              onAddAccountClick={handleNoEthAccountClose(true)}
            />
          )}
        </section>
      </Content>
      <Footer>
        <div className="grid w-full grid-cols-2 gap-12">
          <Button onClick={reject}>{t("Reject")}</Button>
          <Button primary onClick={authorise} disabled={connected.length <= 0}>
            {t("Connect")} {connected.length > 0 && connected.length}
          </Button>
        </div>
      </Footer>
    </Layout>
  )
}
