import { ActionEnum } from "@blowfishxyz/api-client/v20230605"
import { FC, useMemo } from "react"
import { Button, ButtonProps } from "talisman-ui"

import { useRiskAnalysis } from "./Ethereum/riskAnalysis"

export const SignApproveButton: FC<ButtonProps> = (props) => {
  const riskAnalysis = useRiskAnalysis()

  const color = useMemo(() => {
    switch (riskAnalysis?.result?.action) {
      case ActionEnum.Block:
        return "red"
      case ActionEnum.Warn:
        return "orange"
      default:
        return "primary"
    }
  }, [riskAnalysis?.result?.action])

  return <Button {...props} color={color} />
}
