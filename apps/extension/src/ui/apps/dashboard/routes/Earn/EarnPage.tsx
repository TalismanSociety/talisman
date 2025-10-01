import { FC } from "react"

import { EarnTokensTable } from "./components/EarnTokensTable"

export const ProductionSelectionPage: FC = () => {
  return (
    <div className="flex size-full flex-col">
      <div className="flex grow flex-col overflow-hidden">
        <EarnTokensTable />
      </div>
    </div>
  )
}
