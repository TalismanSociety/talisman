import { EarnAvailableProducts } from "@ui/domains/Earn/components/EarnAvailableProducts"
import type { FC } from "react"

export const DashboardEarnDiscoverTab: FC<{ search: string }> = ({ search }) => {
  return (
    <div className="min-w-112.5 text-left text-base text-body-secondary">
      <div className="mb-6">
        <EarnAvailableProducts search={search} />
      </div>
    </div>
  )
}
