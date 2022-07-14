import { PortfolioProvider } from "@ui/domains/Portfolio/context"
import Site from "@ui/domains/Site"
import { Route, Routes } from "react-router-dom"

import { NavigationMenuButton } from "../../components/Navigation/NavigationMenuButton"
import Layout, { Content, Header } from "../../Layout"
import { PortfolioAccounts } from "./PortfolioAccounts"
import { PortfolioAsset } from "./PortfolioAsset"
import { PortfolioAssets } from "./PortfolioAssets"

export const Portfolio = () => {
  return (
    <PortfolioProvider>
      {/* share layout to prevent sidebar flickering when navigating between the 2 pages */}
      <Layout>
        <Header text={<Site.ConnectedAccountsPill />} nav={<NavigationMenuButton />} />
        <Content>
          <Routes>
            <Route path="assets" element={<PortfolioAssets />} />
            <Route path=":symbol" element={<PortfolioAsset />} />
            <Route path="" element={<PortfolioAccounts />} />
          </Routes>
        </Content>
      </Layout>
    </PortfolioProvider>
  )
}
