import { DashboardAssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { GetStarted } from "@ui/domains/Portfolio/GetStarted/GetStarted"
import { usePortfolioSearch } from "@ui/state/portfolio"

export const PortfolioAssets = () => {
  const search = usePortfolioSearch()

  return (
    <>
      <DashboardAssetsTable />
      {!search && <GetStarted />}
    </>
  )
}
