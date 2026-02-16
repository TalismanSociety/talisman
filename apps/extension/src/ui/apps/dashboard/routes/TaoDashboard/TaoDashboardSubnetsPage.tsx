import { EarnTabsDashboard } from "@ui/domains/Earn/components/EarnTabsDashboard"
import { TaoDashboardHeader } from "@ui/domains/TaoDashboard/subnets/TaoDashboardHeader"
import { TaoDashboardSubnetsTable } from "@ui/domains/TaoDashboard/subnets/TaoDashboardSubnetsTable"

export const TaoDashboardSubnetsPage = () => {
  return (
    <div className="flex w-full min-w-[45rem] flex-col gap-6 overflow-hidden">
      <TaoDashboardHeader />

      <div className="mb-6 flex w-full items-center justify-between overflow-hidden">
        <div className="flex-shrink-0">
          <EarnTabsDashboard />
        </div>
        <div className="h-[3.6rem] w-[28rem] shrink-0" />
      </div>

      <div>
        <TaoDashboardSubnetsTable />
      </div>
    </div>
  )
}
