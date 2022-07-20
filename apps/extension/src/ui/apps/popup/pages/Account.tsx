import Account from "@ui/domains/Account"
import Site from "@ui/domains/Site"
import { useAnalyticsPopupOpen } from "@ui/hooks/useAnalyticsPopupOpen"
import { Suspense, lazy } from "react"
import styled from "styled-components"

import { NavigationMenuButton } from "../components/Navigation/NavigationMenuButton"
import { TotalFiatBalance } from "../components/TotalFiatBalance"
import Layout, { Content, Header } from "../Layout"

const BraveWarningPopupBanner = lazy(
  () => import("@ui/domains/Settings/BraveWarning/BraveWarningPopupBanner")
)
const AnalyticsAlert = lazy(() => import("@ui/domains/Settings/Analytics/AnalyticsAlert"))

const AccountAssets = ({ className }: any) => {
  useAnalyticsPopupOpen("accounts")

  return (
    <Layout className={className}>
      <Header text={<Site.ConnectedAccountsPill />} nav={<NavigationMenuButton />} />
      <Content>
        <TotalFiatBalance />
        <Account.List withAvatar withCopy withBalanceRow withFiat />
      </Content>
    </Layout>
  )
}

const StyledAccount = styled(AccountAssets)`
  .layout-header {
    height: 7.2rem;
    min-height: 7.2rem;
    > nav {
      > svg {
        cursor: pointer;
        &:not([data-primary]) {
          opacity: 0.3;
          &:hover {
            opacity: 0.8;
          }
        }
      }
    }

    .build-version {
      margin-left: -5rem;
    }
  }

  .layout-content {
    .chain-balance {
      font-size: var(--font-size-small);
    }

    .account-name {
      .name {
        max-width: 100%;
      }
    }
  }

  .layout-footer {
    height: 6.5rem;
    border-top: 1px solid var(--color-background-muted);
    display: flex;
    align-items: center;
    justify-content: space-between;

    > svg {
      font-size: var(--font-size-large);
      margin: 0 3.2rem;
      opacity: 0.6;
      cursor: pointer;
      &:hover {
        opacity: 1;
      }
    }
  }
`

export default StyledAccount
