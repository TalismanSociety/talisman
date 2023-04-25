import { useState } from "react"
import { Button, ProcessAnimation, ProcessAnimationStatus } from "talisman-ui"

import { Layout } from "../shared/Layout"

export const TxStatusPage = () => {
  const [status, setStatus] = useState<ProcessAnimationStatus>("processing")

  return (
    <Layout title="Mystical Background">
      <div className="my-16 flex gap-8">
        <Button primary={status === "processing"} onClick={() => setStatus("processing")}>
          Processing
        </Button>
        <Button primary={status === "success"} onClick={() => setStatus("success")}>
          Success
        </Button>
        <Button primary={status === "failure"} onClick={() => setStatus("failure")}>
          Failure
        </Button>
      </div>
      <div>
        <ProcessAnimation status={status} className="h-96 " />
      </div>
    </Layout>
  )
}
