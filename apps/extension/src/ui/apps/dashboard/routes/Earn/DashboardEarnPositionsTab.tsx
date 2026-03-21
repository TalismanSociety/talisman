import { EarnPositionsList } from "@ui/domains/Earn/components/EarnPositionsList"
import type { FC } from "react"

export const DashboardEarnPositionsTab: FC<{ search: string }> = ({ search }) => (
  <div className="min-w-112.5 text-left text-base text-body-secondary">
    <EarnPositionsList search={search} />
  </div>
)
