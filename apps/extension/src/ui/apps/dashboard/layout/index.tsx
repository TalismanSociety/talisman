import { FC } from "react"
import styled from "styled-components"
import { SendTokensModal } from "@ui/domains/Asset/Send/SendTokensModal"
import { SideBar } from "./SideBar"
import { BackButton } from "@talisman/components/BackButton"
import { AddressFormatterModal } from "@ui/domains/Account/AddressFormatterModal"

type LayoutProps = {
  centered?: boolean
  large?: boolean
  withBack?: boolean
  className?: string
}

const UnstyledLayout: FC<LayoutProps> = ({ withBack, children, className }) => (
  <main className={className}>
    <SideBar />
    <article>
      <div className="children">
        {!!withBack && <BackButton className="back" />}
        {children}
      </div>
    </article>
    <SendTokensModal />
    <AddressFormatterModal />
  </main>
)

const Layout = styled(UnstyledLayout)`
  width: 100%;
  height: 100vh;
  color: var(--color-forground);
  display: flex;

  > article {
    flex-grow: 1;
    padding: 5.2rem;
    overflow: hidden;
    overflow-y: scroll;
    position: relative;

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
`

export default Layout
