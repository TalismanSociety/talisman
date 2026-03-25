import { EarnAvailableProducts } from "@ui/domains/Earn/components/EarnAvailableProducts"
import type { FC } from "react"

export const PopupEarnDiscoverTab: FC<{ search: string }> = ({ search }) => {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="mb-4">
        <EarnAvailableProducts search={search} />
      </div>
    </div>
  )
}
