import { useEffect } from "react"
import { Outlet } from "react-router-dom"

import { useOnboard } from "../context"

export const OnboardStageWrapper = ({ stage }: { stage: number }) => {
  const { setStage } = useOnboard()
  useEffect(() => setStage(stage), [stage, setStage])
  return <Outlet />
}
