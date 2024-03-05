import { GenericExtrinsic } from "@polkadot/types"
import { IRuntimeVersionBase, SignerPayloadJSON, SignerPayloadRaw } from "@polkadot/types/types"
import { HexString } from "@polkadot/util/types"
import { provideContext } from "@talisman/util/provideContext"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { balancesHydrateAtom } from "@ui/atoms"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import useChains from "@ui/hooks/useChains"
import { useExtrinsic } from "@ui/hooks/useExtrinsic"
import { getExtrinsicDispatchInfo } from "@ui/util/getExtrinsicDispatchInfo"
import { isJsonPayload } from "extension-core"
import { SubstrateSigningRequest } from "extension-core"
import { log } from "extension-shared"
import { useAtomValue } from "jotai"
import { useCallback, useMemo } from "react"

import { useAnySigningRequest } from "./AnySignRequestContext"

const usePartialFee = (
  payload: SignerPayloadJSON | SignerPayloadRaw | undefined,
  extrinsic: GenericExtrinsic | null | undefined
) => {
  const chain = useChainByGenesisHash(
    payload && isJsonPayload(payload) ? payload.genesisHash : undefined
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

const usePolkadotSigningRequestProvider = ({
  signingRequest,
}: {
  signingRequest: SubstrateSigningRequest
}) => {
  useAtomValue(balancesHydrateAtom)
  const payload = signingRequest?.request?.payload

  const baseRequest = useAnySigningRequest({
    currentRequest: signingRequest,
    approveSignFn: api.approveSign,
    cancelSignFn: api.cancelSignRequest,
  })

  const { chains } = useChains({ activeOnly: false, includeTestnets: true })
  const chain = useMemo(() => {
    if (!signingRequest) return
    const { genesisHash } = (signingRequest?.request?.payload ?? {}) as SignerPayloadJSON
    return (genesisHash && (chains || []).find((c) => c.genesisHash === genesisHash)) || null
  }, [signingRequest, chains])

  const {
    data: extrinsic,
    isLoading: isDecodingExtrinsic,
    error: errorDecodingExtrinsic,
  } = useExtrinsic(payload)
  const { data: fee, isLoading: isLoadingFee, error: errorFee } = usePartialFee(payload, extrinsic)

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

  return {
    payload,
    signingRequest,
    ...baseRequest,
    chain,
    approveSignet,
    approveHardware,
    approveQr,
    extrinsic,
    isDecodingExtrinsic,
    errorDecodingExtrinsic,
    fee,
    isLoadingFee,
    errorFee,
  }
}

export const [PolkadotSigningRequestProvider, usePolkadotSigningRequest] = provideContext(
  usePolkadotSigningRequestProvider
)
