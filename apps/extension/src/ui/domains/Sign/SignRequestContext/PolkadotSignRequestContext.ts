import { SignerPayloadJSON, SubstrateSigningRequest } from "@core/domains/signing/types"
import { log } from "@core/log"
import { HexString } from "@polkadot/util/types"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import useChains from "@ui/hooks/useChains"
import { useExtrinsic } from "@ui/hooks/useExtrinsic"
import { useCallback, useMemo } from "react"

import { useAnySigningRequest } from "./AnySignRequestContext"

const usePolkadotSigningRequestProvider = ({
  signingRequest,
}: {
  signingRequest: SubstrateSigningRequest
}) => {
  const payload = signingRequest?.request?.payload
  const { isLoading } = useExtrinsic(payload)

  const baseRequest = useAnySigningRequest({
    currentRequest: signingRequest,
    approveSignFn: api.approveSign,
    cancelSignFn: api.cancelSignRequest,
  })

  const { chains } = useChains(true)
  const chain = useMemo(() => {
    if (!signingRequest) return
    const { genesisHash } = (signingRequest?.request?.payload ?? {}) as SignerPayloadJSON
    return (genesisHash && (chains || []).find((c) => c.genesisHash === genesisHash)) || null
  }, [signingRequest, chains])

  const approveHardware = useCallback(
    async ({ signature }: { signature: HexString }) => {
      if (!baseRequest || !baseRequest.id) return
      baseRequest.setStatus.processing("Approving request")
      try {
        await api.approveSignHardware(baseRequest.id, signature)
        baseRequest.setStatus.success("Approved")
      } catch (err) {
        log.error("failed to approve hardware", { err })
        baseRequest.setStatus.error("Failed to approve sign request")
      }
    },
    [baseRequest]
  )

  const approveQr = useCallback(
    async ({ signature }: { signature: HexString }) => {
      baseRequest.setStatus.processing("Approving request")
      if (!baseRequest || !baseRequest.id) return
      try {
        await api.approveSignQr(baseRequest.id, signature)
        baseRequest.setStatus.success("Approved")
      } catch (err) {
        log.error("failed to approve qr", { err })
        baseRequest.setStatus.error("Failed to approve sign request")
      }
    },
    [baseRequest]
  )

  return {
    payload,
    signingRequest,
    ...baseRequest,
    chain,
    approveHardware,
    approveQr,
    isLoading,
  }
}

export const [PolkadotSigningRequestProvider, usePolkadotSigningRequest] = provideContext(
  usePolkadotSigningRequestProvider
)
