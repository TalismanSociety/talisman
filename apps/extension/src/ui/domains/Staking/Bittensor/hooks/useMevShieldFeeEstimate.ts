import type { SignerPayloadJSON } from "@core/types/pjsInterop"
import type { ScaleApi } from "@talismn/sapi"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"

// MEV Shield encryption overhead:
// 16 (keyHash) + 2 (kemLen) + 1088 (kemCt) + 24 (nonce) + 16 (AEAD tag)
const MEV_SHIELD_ENCRYPTION_OVERHEAD = 1146

// Approximate overhead for a signed extrinsic (version, address, signature, era, nonce, tip, mode)
const SIGNED_EXTRINSIC_OVERHEAD = 110

/**
 * The outer MEV Shield wrapper transaction (`MevShield.submit_encrypted`) of an inner payload,
 * with a dummy ciphertext of the size the inner one encrypts to, so the on-chain weight
 * calculation is realistic.
 */
const getMevShieldOuterPayload = async (
  sapi: ScaleApi,
  address: string,
  innerPayload: SignerPayloadJSON
) => {
  const innerMethodBytes = (innerPayload.method.length - 2) / 2
  const ciphertextSize =
    MEV_SHIELD_ENCRYPTION_OVERHEAD + innerMethodBytes + SIGNED_EXTRINSIC_OVERHEAD

  const { payload } = await sapi.getExtrinsicPayload(
    "MevShield",
    "submit_encrypted",
    { ciphertext: new Uint8Array(ciphertextSize) },
    { address }
  )
  return payload
}

export const useMevShieldFeeEstimate = ({
  sapi,
  address,
  innerFeeEstimatePayload,
  enabled,
}: {
  sapi: ScaleApi | undefined | null
  address: string | null
  innerFeeEstimatePayload: SignerPayloadJSON | undefined
  enabled: boolean
}) => {
  const { data: outerPayload } = useQuery({
    queryKey: ["mevShieldOuterPayload", sapi?.id, address, innerFeeEstimatePayload?.method],
    queryFn: () =>
      sapi && address && innerFeeEstimatePayload
        ? getMevShieldOuterPayload(sapi, address, innerFeeEstimatePayload)
        : null,
    enabled: enabled && !!sapi && !!address && !!innerFeeEstimatePayload,
    placeholderData: keepPreviousData,
  })

  return useGetFeeEstimate({ sapi, payload: outerPayload ?? undefined })
}
