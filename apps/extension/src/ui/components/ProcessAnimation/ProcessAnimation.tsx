import { Lottie } from "lottie-react"
import { type FC, useCallback, useEffect, useMemo, useState } from "react"

import animDataFailure from "./lottie-tx-failure.json"
import animDataProcessing from "./lottie-tx-processing.json"
import animDataSuccess from "./lottie-tx-success.json"

export type ProcessAnimationStatus = "processing" | "success" | "failure"

const animationData: Record<ProcessAnimationStatus, object> = {
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

  const subscriptions = useMemo(() => ({ loopCompleted: handleLoopComplete }), [handleLoopComplete])

  return (
    <Lottie
      className={className}
      src={animationData[animStatus]}
      subscriptions={subscriptions}
      loop={animStatus === "processing"}
      autoplay
    />
  )
}
