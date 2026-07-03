import type { SignerPayloadJSON } from "@polkadot/types/types"
import type { ScaleApi } from "@talismn/sapi"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"

// MEV Shield encryption overhead:
// 16 (keyHash) + 2 (kemLen) + 1088 (kemCt) + 24 (nonce) + 16 (AEAD tag)
const MEV_SHIELD_ENCRYPTION_OVERHEAD = 1146

// Approximate overhead for a signed extrinsic (version, address, signature, era, nonce, tip, mode)
const SIGNED_EXTRINSIC_OVERHEAD = 110

/**
 * Estimates the network fee for the outer MEV Shield wrapper transaction
 * (`MevShield.submit_encrypted`). Builds a dummy payload with a ciphertext
 * sized from the inner fee-estimation payload so the on-chain weight
 * calculation is realistic.
 */
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
    queryFn: async () => {
      if (!sapi || !address || !innerFeeEstimatePayload) return null

      const innerMethodBytes = (innerFeeEstimatePayload.method.length - 2) / 2
      const ciphertextSize =
        MEV_SHIELD_ENCRYPTION_OVERHEAD + innerMethodBytes + SIGNED_EXTRINSIC_OVERHEAD

      const dummyCiphertext = new Uint8Array(ciphertextSize)

      const result = await sapi.getExtrinsicPayload(
        "MevShield",
        "submit_encrypted",
        { ciphertext: dummyCiphertext },
        { address }
      )

      return result.payload
    },
    enabled: enabled && !!sapi && !!address && !!innerFeeEstimatePayload,
    placeholderData: keepPreviousData,
  })

  return useGetFeeEstimate({ sapi, payload: outerPayload ?? undefined })
}
