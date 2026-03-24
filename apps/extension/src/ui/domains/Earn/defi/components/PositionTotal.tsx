import type { DefiPosition } from "@core/domains/defi/exports"
import { FiatFromUsd } from "@ui/domains/Asset/Fiat"
import type { FC } from "react"
import { useDefiPositionTotalValueUsd } from "../useDefiItemValueUsd"

export const PositionTotal: FC<{ position: DefiPosition; noCountUp?: boolean }> = ({
  position,
  noCountUp,
}) => {
  const totalValue = useDefiPositionTotalValueUsd(position)

  return <FiatFromUsd amount={totalValue} isBalance noCountUp={noCountUp} />
}
