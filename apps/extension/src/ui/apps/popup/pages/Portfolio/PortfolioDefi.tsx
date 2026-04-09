import { PortfolioDefiContent } from "@ui/domains/Portfolio/PortfolioDefiContent"
import { PortfolioTabs } from "@ui/domains/Portfolio/PortfolioTabs"

import { PortfolioAssetsHeader } from "./shared/PortfolioAssetsHeader"

export const PortfolioDefi = () => {
  return (
    <>
      <PortfolioAssetsHeader />
      <PortfolioTabs className="mt-4" />
      <PortfolioDefiContent className="py-64" />
    </>
  )
}
