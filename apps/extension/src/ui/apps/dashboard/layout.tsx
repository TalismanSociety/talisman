import Button from "@talisman/components/Button"
import { Card } from "@talisman/components/Card"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import Nav, { NavItem } from "@talisman/components/Nav"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { ReactComponent as IconAlert } from "@talisman/theme/icons/alert-circle.svg"
import { ReactComponent as IconChevron } from "@talisman/theme/icons/chevron-left.svg"
import { ReactComponent as IconPlus } from "@talisman/theme/icons/plus.svg"
import { ReactComponent as IconSettings } from "@talisman/theme/icons/settings.svg"
import { ReactComponent as IconUser } from "@talisman/theme/icons/user.svg"
import { ReactComponent as Logo } from "@talisman/theme/logos/talisman-full-color.svg"
import Mnemonic from "@ui/domains/Account/Mnemonic"
import { SendTokensModal } from "@ui/domains/Asset/Send/SendTokensModal"
import Build from "@ui/domains/Build"
import useAccounts from "@ui/hooks/useAccounts"
import { useMnemonicBackupConfirmed } from "@ui/hooks/useMnemonicBackupConfirmed"
import { FC, PropsWithChildren, ReactNode, Suspense, lazy, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import styled from "styled-components"

const BraveWarningBanner = lazy(
  () => import("@ui/domains/Settings/BraveWarning/BraveWarningBanner")
)

type LayoutProps = {
  centered?: boolean
  withBack?: boolean
  className?: string
  children?: ReactNode
}

const BackButton = ({ className }: PropsWithChildren<any>) => {
  const navigate = useNavigate()
  const handleBackClick = useCallback(() => navigate(-1), [navigate])

  return (
    <Button className={`back ${className}`} small onClick={handleBackClick}>
      <IconChevron />
      Back
    </Button>
  )
}

const StyledBackButton = styled(BackButton)`
  background: var(--color-background-muted);
  border: none;
  color: var(--color-background-muted-2x);
  padding: 0.3em;
`

const BrandLogo = styled(({ className }) => {
  return (
    <div className={className}>
      <Logo className="logo" />
      <Build.Version />
    </div>
  )
})`
  width: -webkit-fill-available;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 4rem 3rem 3rem 3.8rem;

  .logo {
    width: auto;
    height: 3.2rem;
  }
`

const BackupBanner = styled(({ className }) => {
  const { isOpen, open, close } = useOpenClose()
  const accounts = useAccounts()
  const backupConfirmed = useMnemonicBackupConfirmed()
  const originAccount = accounts?.find((account) => account.origin === "ROOT")

  if (backupConfirmed !== "FALSE" || !originAccount) return null

  return (
    <>
      <Card
        className={className}
        title={
          <>
            <IconAlert className="icon" /> Please backup your account
          </>
        }
        description={
          <span>If you don’t backup your account, you may lose access to all your funds</span>
        }
        cta={
          <Button primary onClick={open}>
            Backup now
          </Button>
        }
      />
      <Modal open={isOpen} onClose={close}>
        <ModalDialog title="Secret Phrase" onClose={close}>
          <Mnemonic address={originAccount?.address} />
        </ModalDialog>
      </Modal>
    </>
  )
})`
  margin: 2rem;

  .icon {
    color: var(--color-primary);
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .card-description {
    color: var(--color-mid);
    font-size: small;
  }

  .card-cta > * {
    width: 100%;
  }
`

const Layout: FC<LayoutProps> = ({ withBack, children, className }) => (
  <main className={className}>
    <aside>
      <BrandLogo />
      <div className="scrollable">
        <div className="top">
          <Nav column>
            <NavItem to="/accounts" icon={<IconUser />} end>
              Accounts
            </NavItem>
            <NavItem to="/accounts/add" icon={<IconPlus />}>
              Add Account
            </NavItem>
            <NavItem to="/settings" icon={<IconSettings />}>
              Settings
            </NavItem>
          </Nav>
        </div>
        <div className="bottom">
          <Suspense fallback={null}>
            <BraveWarningBanner />
          </Suspense>
          <BackupBanner />
        </div>
      </div>
    </aside>
    <article>
      <div className="children">
        {!!withBack && <StyledBackButton />}
        {children}
      </div>
    </article>
    <SendTokensModal />
  </main>
)

const StyledLayout = styled(Layout)`
  width: 100%;
  height: 100vh;
  color: var(--color-forground);
  display: flex;

  > aside,
  > article {
    display: block;
    width: 100%;
    position: relative;
  }

  > aside {
    width: 32.8vw;
    min-width: 32rem;
    //width: 32rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    background: var(--color-background-muted);

    .scrollable {
      width: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: flex-start;
      background: var(--color-background-muted);
      overflow-y: scroll;
      flex-grow: 1;
    }

    .top,
    .bottom {
      display: block;
      width: 100%;
    }

    nav {
      display: block;
      display: block;
      margin: 5rem 2.4rem;

      .link {
        border-radius: var(--border-radius);
        transition: all var(--transition-speed) ease-in-out;
        background: rgb(var(--color-foreground-raw), 0);
        width: 100%;
        margin-bottom: 0.5vw;

        &:hover {
          background: rgb(var(--color-foreground-raw), 0.05);
        }
      }
    }
  }

  > article {
    padding: 3vw 5.6vw;
    overflow: hidden;
    overflow-y: scroll;

    > .children {
      display: block;
      width: 100%;
      position: relative;

      > .back {
        margin-bottom: 3rem;
      }
    }

    ${({ centered }) =>
      !!centered &&
      `
      display: flex;
      align-items: flex-start;
      justify-content: center;

      >.children{
        margin-top: 4vw;
        max-width: 66rem;
      }
    `}
  }
`

export default StyledLayout
