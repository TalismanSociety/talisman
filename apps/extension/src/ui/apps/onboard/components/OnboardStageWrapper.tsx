import { ReactNode, useEffect } from "react"

import { useOnboard } from "../context"

export const OnboardStageWrapper = ({
  stage,
  children,
}: {
  stage: number
  children: ReactNode
}) => {
  const { setStage } = useOnboard()
  useEffect(() => setStage(stage), [stage, setStage])
  return <>{children}</>
}
