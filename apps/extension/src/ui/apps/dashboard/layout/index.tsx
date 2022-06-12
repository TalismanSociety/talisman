import { FC, lazy, Suspense } from "react"
import styled from "styled-components"
import { SendTokensModal } from "@ui/domains/Asset/Send/SendTokensModal"
import { SideBar } from "./SideBar"
import { BackButton } from "@talisman/components/BackButton"
import { AddressFormatterModal } from "@ui/domains/Account/AddressFormatterModal"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { AccountRenameModal } from "@ui/domains/Account/AccountRenameModal"
import { AccountRemoveModal } from "@ui/domains/Account/AccountRemoveModal"

const DashboardNotifications = lazy(() => import("./DashboardNotifications"))

type LayoutProps = {
  centered?: boolean
  large?: boolean
  withBack?: boolean
  className?: string
}

const UnstyledLayout: FC<LayoutProps> = ({ withBack, children, className }) => (
  <main className={className}>
    <SideBar />
    <ScrollContainer className="main-area">
      <div className="children">
        {!!withBack && <BackButton className="back" />}
        {children}
      </div>
      <Suspense fallback={null}>
        <DashboardNotifications />
      </Suspense>
    </ScrollContainer>
    <SendTokensModal />
    <AccountRenameModal />
    <AccountRemoveModal />
    <AddressFormatterModal />
  </main>
)

const Layout = styled(UnstyledLayout)`
  width: 100%;
  height: 100vh;
  color: var(--color-forground);
  display: flex;

  .main-area {
    flex-grow: 1;
    overflow: hidden;
    overflow-y: scroll;

    .scrollable-children {
      padding: 5.2rem;

      > .children {
        display: block;
        width: 100%;
        position: relative;

        > .back {
          margin-bottom: 3rem;
        }
      }

      ${({ centered, large }) =>
        !!centered &&
        `
      display: flex;
      align-items: flex-start;
      justify-content: center;

      > .children{
        max-width: ${large ? "96rem" : "66rem"};
      }
    `}
    }
  }
`

export default Layout
