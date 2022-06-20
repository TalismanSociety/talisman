import { Route, Routes } from "react-router-dom"
import Layout, { Content, Header } from "../../Layout"
import { PortfolioProvider } from "@ui/domains/Portfolio/context"
import { PortfolioAsset } from "./PortfolioAsset"
import { PortfolioAssets } from "./PortfolioAssets"
import Site from "@ui/domains/Site"
import { NavigationMenuButton } from "../../components/Navigation/NavigationMenuButton"

export const Portfolio = () => {
  return (
    <PortfolioProvider>
      {/* share layout to prevent sidebar flickering when navigating between the 2 pages */}
      <Layout>
        <Header text={<Site.ConnectedAccountsPill />} nav={<NavigationMenuButton />} />
        <Content>
          <Routes>
            <Route path=":symbol" element={<PortfolioAsset />} />
            <Route path="" element={<PortfolioAssets />} />
          </Routes>
        </Content>
      </Layout>
    </PortfolioProvider>
  )
}
