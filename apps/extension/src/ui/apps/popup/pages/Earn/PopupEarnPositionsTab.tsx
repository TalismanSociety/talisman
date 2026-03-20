import { EarnPositionsList } from "@ui/domains/Earn/components/EarnPositionsList"
import type { FC } from "react"

export const PopupEarnPositionsTab: FC<{ search: string }> = ({ search }) => (
  <div className="@container flex w-full flex-col @2xl:gap-8 gap-4">
    <EarnPositionsList search={search} />
  </div>
)
