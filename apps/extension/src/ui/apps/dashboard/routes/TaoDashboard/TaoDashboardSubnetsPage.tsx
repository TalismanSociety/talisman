import { EarnTabsDashboard } from "@ui/domains/Earn/components/EarnTabsDashboard"
import { TaoDashboardHeader } from "@ui/domains/TaoDashboard/subnets/TaoDashboardHeader"
import { TaoDashboardSubnetsTable } from "@ui/domains/TaoDashboard/subnets/TaoDashboardSubnetsTable"

export const TaoDashboardSubnetsPage = () => {
  return (
    <div className="flex w-full flex-col gap-12 overflow-hidden">
      <TaoDashboardHeader />
      <EarnTabsDashboard />
      <TaoDashboardSubnetsTable />
    </div>
  )
}
