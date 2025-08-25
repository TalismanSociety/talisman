import { DefiPosition } from "extension-core"
import { FC, useMemo } from "react"

import { FiatFromUsd } from "@ui/domains/Asset/Fiat"

export const PositionTotal: FC<{ position: DefiPosition; noCountUp?: boolean }> = ({
  position,
  noCountUp,
}) => {
  const totalValue = useMemo(
    () => position.breakdown.reduce((acc, item) => acc + item.valueUsd, 0),
    [position.breakdown],
  )

  return <FiatFromUsd amount={totalValue} isBalance noCountUp={noCountUp} />
}
