import { useState, useEffect, useCallback } from "react"
import type { MetadataRequest } from "@core/types"
import useStatus, { statusOptions } from "@talisman/hooks/useStatus"
import { useMetadataRequests } from "./useMetadataRequests"
import { api } from "@ui/api"

interface IProps {
  onError: (msg: string) => void
  onRejection: (msg: string) => void
  onSuccess: () => void
}

type CurrentMetadataRequest = MetadataRequest & {
  status: string
  approve: () => void
  reject: () => void
}

const useCurrentMetadataRequest = ({
  onSuccess,
  onError,
  onRejection,
}: IProps): CurrentMetadataRequest => {
  const metaDataRequests = useMetadataRequests()
  //const { metaDataRequests, rejectMetaRequest, approveMetaRequest } = useMetadataContext()
  const [currentRequest, setCurrentRequest] = useState<MetadataRequest>()
  const { status, setStatus } = useStatus({
    status: statusOptions.PROCESSING,
  })

  useEffect(() => {
    if (metaDataRequests[0]) {
      setCurrentRequest(metaDataRequests[0])
      setStatus.initialized()
    } else {
      //onError("No pending metadata requests on stack")
    }
  }, [metaDataRequests, setCurrentRequest, onError, setStatus])

  const approve = useCallback(async () => {
    setStatus.processing()
    await api.approveMetaRequest(currentRequest?.id as string)
    setStatus.success()
    onSuccess()
  }, [currentRequest?.id, onSuccess, setStatus])

  const reject = useCallback(async () => {
    setStatus.processing()
    api.rejectMetaRequest(currentRequest?.id as string)
    setStatus.success()
    onRejection("Metadata request rejected")
  }, [currentRequest?.id, onRejection, setStatus])

  return {
    ...currentRequest,
    status,
    approve,
    reject,
  } as CurrentMetadataRequest
}

export default useCurrentMetadataRequest
