import { FC, useMemo } from "react"
import { Button, ButtonProps } from "talisman-ui"

import { useRiskAnalysis } from "./Ethereum/riskAnalysis"

export const SignApproveButton: FC<ButtonProps> = (props) => {
  const riskAnalysis = useRiskAnalysis()

  const color = useMemo(() => {
    switch (riskAnalysis?.result?.action) {
      case "BLOCK":
        return "red"
      case "WARN":
        return "orange"
      default:
        return "primary"
    }
  }, [riskAnalysis?.result?.action])

  return <Button {...props} color={color} />
}
