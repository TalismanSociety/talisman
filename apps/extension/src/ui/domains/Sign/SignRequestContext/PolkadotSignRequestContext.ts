import { log } from "@common/log"
import type { SubstrateSigningRequest } from "@core/domains/signing/types"
import type { Address } from "@core/types/base"
import { isJsonPayload } from "@core/util/isJsonPayload"
import type { SignerPayloadJSON, SignerPayloadRaw } from "@polkadot/types/types"
import type { polkadot, polkadotAssetHub } from "@polkadot-api/descriptors"
import type { DecodedCall, ScaleApi } from "@talismn/sapi"
import { papiStringify } from "@talismn/scale"
import type { HexString } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useBalancesHydrate } from "@ui/state/balances"
import { useNetworkByGenesisHash } from "@ui/state/chaindata"
import { provideContext } from "@ui/util/provideContext"
import { useCallback, useEffect, useMemo } from "react"

import { useSubstratePayloadMetadataSuspense } from "../hooks/useSubstratePayloadMetadata"
import { useAnySigningRequest } from "./AnySignRequestContext"

const usePartialFee = (
  payload: SignerPayloadJSON | SignerPayloadRaw,
  sapi: ScaleApi | null | undefined
) => {
  return useQuery({
    queryKey: ["usePartialFee", payload, sapi?.id],
    queryFn: async () => {
      if (!payload || !sapi || !isJsonPayload(payload)) return null

      return sapi.getFeeEstimate(payload)
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  })
}

type DryRunResult = (
  | typeof polkadot
  | typeof polkadotAssetHub
)["descriptors"]["apis"]["DryRunApi"]["dry_run_call"][1]

const useDryRun = ({
  from,
  sapi,
  decodedCall,
}: {
  from: Address
  sapi: ScaleApi | null | undefined
  decodedCall: DecodedCall<unknown> | null | undefined
}) => {
  return useQuery({
    queryKey: ["useDryRun", from, papiStringify(decodedCall), sapi?.id],
    queryFn: async () => {
      if (!from || !sapi || !decodedCall) return null

      return sapi.getDryRunCall<DryRunResult>(from, decodedCall)
    },
    refetchInterval: 10_000,
  })
}

const usePolkadotSigningRequestProvider = ({
  signingRequest,
}: {
  signingRequest: SubstrateSigningRequest
}) => {
  useBalancesHydrate() // preload

  const jsonPayload = isJsonPayload(signingRequest.request.payload)
    ? signingRequest.request.payload
    : null

  const { data: payloadMetadata } = useSubstratePayloadMetadataSuspense(jsonPayload)

  // if target chains has CheckMetadataHash signed extension, we must always use the modified payload
  const [modifiedPayload, registry, shortMetadata, sapi, metadataRpc] = useMemo(() => {
    return !jsonPayload || !payloadMetadata
      ? [undefined, undefined, undefined, undefined, undefined]
      : [
          payloadMetadata.payloadWithMetadataHash,
          payloadMetadata.registry,
          payloadMetadata.txMetadata,
          payloadMetadata.sapi,
          payloadMetadata.metadataRpc,
        ]
  }, [payloadMetadata, jsonPayload])

  const payload = useMemo(
    () => modifiedPayload || signingRequest.request.payload,
    [modifiedPayload, signingRequest.request.payload]
  )

  const [decodedCall, errorDecodingExtrinsic] = useMemo<
    [DecodedCall<unknown> | null, unknown]
  >(() => {
    if (!sapi || !isJsonPayload(payload)) return [null, null]

    try {
      return [sapi.getDecodedCallFromPayload(payload), null]
    } catch (err) {
      log.error("failed to decode call", { err })
      return [null, err]
    }
  }, [payload, sapi])

  const isDryRunAvailable = useMemo(
    () => sapi?.isApiAvailable("DryRunApi", "dry_run_call") || false,
    [sapi]
  )

  const {
    data: dryRun,
    isLoading: dryRunIsLoading,
    error: dryRunError,
  } = useDryRun({
    from: payload.address,
    sapi,
    decodedCall,
  })

  useEffect(() => {
    log.log("DRY RUN", { dryRun, dryRunIsLoading, dryRunError, decodedCall, payload })
  }, [dryRun, dryRunIsLoading, dryRunError, decodedCall, payload])

  const baseRequest = useAnySigningRequest({
    currentRequest: signingRequest,
    approveSignFn: api.approveSign,
    cancelSignFn: api.cancelSignRequest,
  })

  const chain = useNetworkByGenesisHash(jsonPayload?.genesisHash)

  const { data: fee, isLoading: isLoadingFee, error: errorFee } = usePartialFee(payload, sapi)

  const approveHardware = useCallback(
    async ({ signature }: { signature: HexString }) => {
      if (!baseRequest?.id) return
      baseRequest.setStatus.processing("Approving request")
      try {
        await api.approveSignHardware(baseRequest.id, signature, modifiedPayload)
        baseRequest.setStatus.success("Approved")
      } catch (err) {
        log.error("failed to approve hardware", { err })
        baseRequest.setStatus.error("Failed to approve sign request")
      }
    },
    [baseRequest, modifiedPayload]
  )

  const approveQr = useCallback(
    async ({ signature }: { signature: HexString }) => {
      baseRequest.setStatus.processing("Approving request")
      if (!baseRequest?.id) return
      try {
        await api.approveSignQr(baseRequest.id, signature, modifiedPayload)
        baseRequest.setStatus.success("Approved")
      } catch (err) {
        log.error("failed to approve qr", { err })
        baseRequest.setStatus.error("Failed to approve sign request")
      }
    },
    [baseRequest, modifiedPayload]
  )

  const approveSignet = useCallback(async () => {
    baseRequest.setStatus.processing("Approving request")
    if (!baseRequest?.id) return
    try {
      await api.approveSignSignet(baseRequest.id)
      baseRequest.setStatus.success("Approved")
    } catch (err) {
      log.error("failed to approve signet", { err })
      baseRequest.setStatus.error("Failed to approve sign request")
    }
  }, [baseRequest])

  const approve = useCallback(async () => {
    baseRequest.setStatus.processing("Approving request")
    if (!baseRequest?.id) return
    try {
      await api.approveSign(baseRequest.id, modifiedPayload)
      baseRequest.setStatus.success("Approved")
    } catch (err) {
      log.error("failed to approve", { err })
      baseRequest.setStatus.error("Failed to approve sign request")
    }
  }, [baseRequest, modifiedPayload])

  return {
    payload,
    signingRequest,
    ...baseRequest,
    chain,
    approve,
    approveSignet,
    approveHardware,
    approveQr,
    errorDecodingExtrinsic,
    fee,
    isLoadingFee,
    errorFee,
    registry,
    shortMetadata,
    sapi,
    metadataRpc,
    decodedCall,
    isDryRunAvailable,
    dryRun,
    dryRunIsLoading,
  }
}

export const [PolkadotSigningRequestProvider, usePolkadotSigningRequest] = provideContext(
  usePolkadotSigningRequestProvider
)
