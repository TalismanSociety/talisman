import Lottie from "lottie-react"
import { FC, useCallback, useEffect, useState } from "react"

import animDataFailure from "./lottie-tx-failure.json"
import animDataProcessing from "./lottie-tx-processing.json"
import animDataSuccess from "./lottie-tx-success.json"

export type ProcessAnimationStatus = "processing" | "success" | "failure"

const animationData: Record<ProcessAnimationStatus, unknown> = {
  processing: animDataProcessing,
  success: animDataSuccess,
  failure: animDataFailure,
}

export type ProcessAnimationProps = {
  status: ProcessAnimationStatus
  className?: string
}

export const ProcessAnimation: FC<ProcessAnimationProps> = ({ status, className }) => {
  const [animStatus, setAnimStatus] = useState<ProcessAnimationStatus>(status)

  // if not processing, update status immediately
  useEffect(() => {
    if (animStatus !== "processing") setAnimStatus(status)
  }, [status, animStatus])

  // if processing, update status at the end of a loop
  const handleLoopComplete = useCallback(() => {
    if (animStatus === "processing" && animStatus !== status) setAnimStatus(status)
  }, [animStatus, status])

  return (
    <Lottie
      className={className}
      animationData={animationData[animStatus]}
      onLoopComplete={handleLoopComplete}
      loop={animStatus === "processing"}
    />
  )
}
