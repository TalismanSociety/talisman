import { Route, Routes } from "react-router-dom"
import Layout from "../../layout"
import { PortfolioProvider } from "@ui/domains/Portfolio/context"
import { PortfolioAsset } from "./PortfolioAsset"
import { PortfolioAssets } from "./PortfolioAssets"

export const Portfolio = () => {
  return (
    // share layout to prevent sidebar flickering when navigating between the 2 pages
    <Layout centered large>
      <PortfolioProvider>
        <Routes>
          <Route path=":symbol" element={<PortfolioAsset />} />
          <Route path="" element={<PortfolioAssets />} />
        </Routes>
      </PortfolioProvider>
    </Layout>
  )
}
