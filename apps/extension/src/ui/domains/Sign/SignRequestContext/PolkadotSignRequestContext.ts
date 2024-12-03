import { GenericExtrinsic } from "@polkadot/types"
import { IRuntimeVersionBase, SignerPayloadJSON, SignerPayloadRaw } from "@polkadot/types/types"
import { HexString } from "@polkadot/util/types"
import { papiStringify } from "@talismn/scale"
import { useQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo } from "react"

import { Address, isJsonPayload, SubstrateSigningRequest } from "@extension/core"
import { log } from "@extension/shared"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useBalancesHydrate, useChainByGenesisHash } from "@ui/state"
import { getExtrinsicDispatchInfo } from "@ui/util/getExtrinsicDispatchInfo"
import { DecodedCall, ScaleApi } from "@ui/util/scaleApi"

import { useSubstratePayloadMetadataSuspense } from "../../../hooks/useSubstratePayloadMetadata"
import { useAnySigningRequest } from "./AnySignRequestContext"

const usePartialFee = (
  payload: SignerPayloadJSON | SignerPayloadRaw,
  extrinsic: GenericExtrinsic | null | undefined,
) => {
  const chain = useChainByGenesisHash(
    payload && isJsonPayload(payload) ? payload.genesisHash : undefined,
  )

  return useQuery({
    queryKey: ["usePartialFee", payload, chain, extrinsic?.toHex()],
    queryFn: async () => {
      if (!payload || !chain || !extrinsic) return null

      // fake sign it so fees can be queried
      const { blockHash, address, nonce, genesisHash, specVersion, transactionVersion } =
        payload as SignerPayloadJSON

      extrinsic.signFake(address, {
        nonce,
        blockHash,
        genesisHash,
        runtimeVersion: {
          specVersion,
          transactionVersion,
          // other fields aren't necessary for signing
        } as IRuntimeVersionBase,
      })

      const { partialFee } = await getExtrinsicDispatchInfo(chain.id, extrinsic)

      return BigInt(partialFee)
    },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  })
}

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

      return sapi.getDryRunCall(from, decodedCall)
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
  const [modifiedPayload, registry, shortMetadata, sapi] = useMemo(() => {
    return !jsonPayload || !payloadMetadata
      ? [undefined, undefined, undefined, undefined]
      : [
          payloadMetadata.payloadWithMetadataHash,
          payloadMetadata.registry,
          payloadMetadata.txMetadata,
          payloadMetadata.sapi,
        ]
  }, [payloadMetadata, jsonPayload])

  const payload = useMemo(
    () => modifiedPayload || signingRequest.request.payload,
    [modifiedPayload, signingRequest.request.payload],
  )

  const decodedCall = useMemo(() => {
    if (!sapi || !isJsonPayload(payload)) return null

    try {
      return sapi.getDecodedCallFromPayload(payload)
    } catch (err) {
      log.error("failed to decode call", { err })
      return null
    }
  }, [payload, sapi])

  const isDryRunAvailable = useMemo(
    () => sapi?.isApiAvailable("DryRunApi", "dry_run_call") || false,
    [sapi],
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

  const [extrinsic, errorDecodingExtrinsic] = useMemo(() => {
    try {
      return [
        isJsonPayload(payload) && registry ? registry.createType("Extrinsic", payload) : null,
        null,
      ]
    } catch (err) {
      return [null, err]
    }
  }, [payload, registry])

  const baseRequest = useAnySigningRequest({
    currentRequest: signingRequest,
    approveSignFn: api.approveSign,
    cancelSignFn: api.cancelSignRequest,
  })

  const chain = useChainByGenesisHash(jsonPayload?.genesisHash)

  const { data: fee, isLoading: isLoadingFee, error: errorFee } = usePartialFee(payload, extrinsic)

  const approveHardware = useCallback(
    async ({ signature }: { signature: HexString }) => {
      if (!baseRequest || !baseRequest.id) return
      baseRequest.setStatus.processing("Approving request")
      try {
        await api.approveSignHardware(baseRequest.id, signature, modifiedPayload)
        baseRequest.setStatus.success("Approved")
      } catch (err) {
        log.error("failed to approve hardware", { err })
        baseRequest.setStatus.error("Failed to approve sign request")
      }
    },
    [baseRequest, modifiedPayload],
  )

  const approveQr = useCallback(
    async ({ signature }: { signature: HexString }) => {
      baseRequest.setStatus.processing("Approving request")
      if (!baseRequest || !baseRequest.id) return
      try {
        await api.approveSignQr(baseRequest.id, signature, modifiedPayload)
        baseRequest.setStatus.success("Approved")
      } catch (err) {
        log.error("failed to approve qr", { err })
        baseRequest.setStatus.error("Failed to approve sign request")
      }
    },
    [baseRequest, modifiedPayload],
  )

  const approveSignet = useCallback(async () => {
    baseRequest.setStatus.processing("Approving request")
    if (!baseRequest || !baseRequest.id) return
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
    if (!baseRequest || !baseRequest.id) return
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
    extrinsic,
    errorDecodingExtrinsic,
    fee,
    isLoadingFee,
    errorFee,
    registry,
    shortMetadata,
    sapi,
    decodedCall,
    isDryRunAvailable,
    dryRun,
    dryRunIsLoading,
  }
}

export const [PolkadotSigningRequestProvider, usePolkadotSigningRequest] = provideContext(
  usePolkadotSigningRequestProvider,
)
