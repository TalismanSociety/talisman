import { AccountJsonAny } from "@core/domains/accounts/types"
import { KnownRequestIdOnly } from "@core/libs/requests/types"
import { AppPill } from "@talisman/components/AppPill"
import Field from "@talisman/components/Field"
import { IconButton } from "@talisman/components/IconButton"
import { notify } from "@talisman/components/Notifications"
import useSet from "@talisman/hooks/useSet"
import { InfoIcon, XIcon } from "@talisman/theme/icons"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import AccountAvatar from "@ui/domains/Account/Avatar"
import useAccounts from "@ui/hooks/useAccounts"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useRequest } from "@ui/hooks/useRequest"
import { ChangeEventHandler, FC, useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { Button, Drawer, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"
import { Checkbox } from "talisman-ui"

import Layout, { Content, Footer, Header } from "../Layout"

const AccountItem: FC<{
  account: AccountJsonAny
  value: boolean
  onChange: () => void
  className?: string
}> = ({ account, value = false, className, onChange }) => {
  return (
    <button
      type="button"
      className={classNames(
        "bg-black-secondary hover:bg-grey-800 flex h-28 w-full items-center gap-5 rounded-sm px-8",
        className
      )}
      onClick={onChange}
    >
      <AccountAvatar address={account.address} genesisHash={account.genesisHash} />
      <div className="text-body-secondary text-md flex grow items-center gap-4 overflow-x-hidden text-left">
        <div className="overflow-x-hidden text-ellipsis whitespace-nowrap text-left">
          {account.name ?? shortenAddress(account.address)}
        </div>
        <div className="shrink-0 pb-2">
          <AccountTypeIcon origin={account.origin} className="text-primary-500" />
        </div>
      </div>
      <Field.Checkbox value={value} small />
    </button>
  )
}

const NoEthAccountWarning = ({
  onIgnoreClick,
  onAddAccountClick,
}: {
  onIgnoreClick: () => void
  onAddAccountClick: () => void
}) => (
  <Drawer isOpen anchor="bottom">
    <div className="bg-grey-800 flex flex-col gap-8 rounded-t-xl p-12">
      <div className="w-full text-center">
        <InfoIcon className="text-primary-500 inline-block text-[4rem]" />
      </div>
      <p className="text-body-secondary text-center">
        This application requires an <br />
        <strong className="text-body">Ethereum account</strong> to connect.
        <br />
        Would you like to create or import one ?
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

export const Connect: FC<{ className?: string }> = ({ className }) => {
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
        ? allAccounts.filter(
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
      notify({ type: "error", title: "Failed to connect", subtitle: (err as Error).message })
    }
  }, [authRequest, connected])

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
        <h3 className="mt-0 mb-12 pt-10 text-center text-sm font-bold">
          {ethereum
            ? "Choose the account you'd like to connect"
            : "Choose the account(s) you'd like to connect"}
        </h3>
        {!ethereum && (
          <div className="text-body-secondary my-4 text-sm">
            <Tooltip>
              <TooltipTrigger className="text-body-secondary mb-4 text-sm leading-10">
                <Checkbox onChange={handleShowEthAccountsChanged} defaultChecked={showEthAccounts}>
                  Show Eth accounts
                </Checkbox>
              </TooltipTrigger>
              <TooltipContent>Some apps do not work with Ethereum accounts</TooltipContent>
            </Tooltip>
          </div>
        )}
        <section className="flex flex-col gap-4">
          {accounts.map((account) => (
            <AccountItem
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
          <Button onClick={reject}>Reject</Button>
          <Button primary onClick={authorise} disabled={connected.length <= 0}>
            Connect {connected.length > 0 && connected.length}
          </Button>
        </div>
      </Footer>
    </Layout>
  )
}
