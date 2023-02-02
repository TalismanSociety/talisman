import { AppPill } from "@talisman/components/AppPill"
import { Drawer } from "@talisman/components/Drawer"
import Field from "@talisman/components/Field"
import Grid from "@talisman/components/Grid"
import { IconButton } from "@talisman/components/IconButton"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { notify } from "@talisman/components/Notifications"
import Panel from "@talisman/components/Panel"
import { WithTooltip } from "@talisman/components/Tooltip"
import useSet from "@talisman/hooks/useSet"
import { InfoIcon, XIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import Account from "@ui/domains/Account"
import useAccounts from "@ui/hooks/useAccounts"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAuthRequestById } from "@ui/hooks/useAuthRequestById"
import { ChangeEventHandler, useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import styled from "styled-components"
import { Button } from "talisman-ui"
import { Checkbox } from "talisman-ui"

import Layout, { Content, Footer, Header } from "../Layout"

const AccountItem = ({ address, value = 1, onChange, className }: any) => (
  <Panel className={className} onClick={() => onChange(!value)} small>
    <Account.Name address={address} withAvatar />
    <Field.Checkbox value={value} onChange={(value: boolean) => onChange(address, value)} small />
  </Panel>
)

const StyledAccountItem = styled(AccountItem)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
`

const P = styled.p`
  font-size: var(--font-size-small);
  color: var(--color-mid);
  text-align: center;
  margin-bottom: 2.4rem;

  strong {
    color: var(--color-foreground);
    font-weight: var(--font-weight-normal);
  }
`

const NoEthAccountDrawer = styled(Drawer)`
  z-index: 1;
  .modal-dialog {
    background: var(--color-background-muted);
    header {
      padding: 1.6rem;
    }
  }
`

const InfoDialogIcon = styled(InfoIcon)`
  color: var(--color-primary);
  font-size: 4rem;
`

const NoEthAccountWarning = ({
  onIgnoreClick,
  onAddAccountClick,
}: {
  onIgnoreClick: () => void
  onAddAccountClick: () => void
}) => (
  <NoEthAccountDrawer open anchor="bottom">
    <ModalDialog title={<InfoDialogIcon />} centerTitle>
      <P>
        This application requires an <br />
        <strong>Ethereum account</strong> to connect.
        <br />
        Would you like to create/import one ?
      </P>
      <Grid>
        <Button onClick={onIgnoreClick}>No</Button>
        <Button primary onClick={onAddAccountClick}>
          Yes
        </Button>
      </Grid>
    </ModalDialog>
  </NoEthAccountDrawer>
)

const UnstyledConnect = ({ className }: any) => {
  const { id } = useParams<"id">()
  const authRequest = useAuthRequestById(id)
  const { popupOpenEvent } = useAnalytics()
  const allAccounts = useAccounts()
  const { items: connected, toggle, set } = useSet<string>()
  const ethereum = !!authRequest?.request?.ethereum
  const [showEthAccounts, setShowEthAccounts] = useState(false)

  const accounts = useMemo(
    () =>
      authRequest && allAccounts
        ? allAccounts
            .filter(
              ({ type }) =>
                showEthAccounts ||
                (authRequest.request.ethereum ? type === "ethereum" : type !== "ethereum")
            )
            .map((account) => ({
              ...account,
              toggle: () => (ethereum ? set([account?.address]) : toggle(account?.address)),
              approved: connected.includes(account?.address),
            }))
        : [],
    [allAccounts, authRequest, connected, ethereum, set, showEthAccounts, toggle]
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
        for (const account of accounts.filter((a) => a.approved && a.type === "ethereum"))
          account.toggle()
      setShowEthAccounts(e.target.checked)
    },
    [accounts, setShowEthAccounts]
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
        <h3 className="my-14 pt-10 text-center font-bold">
          {ethereum
            ? "Choose the account you'd like to connect"
            : "Choose the account(s) you'd like to connect"}
        </h3>
        {!ethereum && (
          <div className="text-body-secondary my-8 text-sm">
            <WithTooltip tooltip="Some apps do not work with Ethereum accounts">
              <Checkbox onChange={handleShowEthAccountsChanged}>Show Ethereum accounts</Checkbox>
            </WithTooltip>
          </div>
        )}
        <article className="accounts">
          {accounts.map(({ address, approved, toggle }) => (
            <StyledAccountItem
              key={address}
              className={"account"}
              address={address}
              value={approved}
              onChange={toggle}
            />
          ))}

          {isMissingEthAccount && (
            <NoEthAccountWarning
              onIgnoreClick={handleNoEthAccountClose(false)}
              onAddAccountClick={handleNoEthAccountClose(true)}
            />
          )}
        </article>
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

export const Connect = styled(UnstyledConnect)`
  .layout-content {
    text-align: left;

    h3 {
      font-size: var(--font-size-small);
      margin-top: 0;
      line-height: 2rem;
    }

    .accounts {
      margin-top: 0.4em;

      .account-name {
        overflow: hidden;
        color: var(--color-mid);
        padding-left: 0.8rem;
      }

      .account + .account {
        margin-top: 0.5em;
      }
    }
  }

  .layout-footer {
    .disclaimer {
      font-size: var(--font-size-xsmall);
      color: var(--color-background-muted-2x);
      display: block;
      text-align: center;
    }
  }
`
