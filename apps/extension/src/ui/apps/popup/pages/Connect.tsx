import { AppPill } from "@talisman/components/AppPill"
import Button from "@talisman/components/Button"
import { Drawer } from "@talisman/components/Drawer"
import Field from "@talisman/components/Field"
import Grid from "@talisman/components/Grid"
import { IconButton } from "@talisman/components/IconButton"
import { ModalDialog } from "@talisman/components/ModalDialog"
import Panel from "@talisman/components/Panel"
import { InfoIcon, XIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import Account from "@ui/domains/Account"
import { useAnalyticsPopupOpen } from "@ui/hooks/useAnalyticsPopupOpen"
import useCurrentAuthorisationRequest from "@ui/hooks/useCurrentAuthorisationRequest"
import { useCallback } from "react"
import styled from "styled-components"
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

const Connect = ({ className, onSuccess }: any) => {
  const {
    request,
    accounts,
    connected,
    canIgnore,
    authorise,
    reject,
    ignore,
    ethereum,
    chainId,
    setChainId,
  } = useCurrentAuthorisationRequest({
    onError: (msg) => window.close(),
    onRejection: (msg) => window.close(),
    onSuccess: () => window.close(),
    onIgnore: () => window.close(),
  })

  useAnalyticsPopupOpen("connect")

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

  return (
    <Layout className={className}>
      <Header
        text={<AppPill url={request?.url} />}
        nav={
          <IconButton onClick={canIgnore ? ignore : reject}>
            <XIcon />
          </IconButton>
        }
      />

      <Content>
        <h3>
          {ethereum
            ? "Choose the account you'd like to connect"
            : "Choose the account(s) you'd like to connect"}
        </h3>
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

          {accounts.length === 0 && (
            <NoEthAccountWarning
              onIgnoreClick={handleNoEthAccountClose(false)}
              onAddAccountClick={handleNoEthAccountClose(true)}
            />
          )}
        </article>
      </Content>
      <Footer>
        <Grid>
          <Button onClick={reject}>Reject</Button>
          <Button primary onClick={authorise} disabled={connected.length <= 0}>
            Connect {connected.length > 0 && connected.length}
          </Button>
        </Grid>
      </Footer>
    </Layout>
  )
}

const StyledConnect = styled(Connect)`
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

export default StyledConnect
