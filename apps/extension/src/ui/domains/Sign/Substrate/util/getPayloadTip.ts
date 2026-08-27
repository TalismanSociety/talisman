import type { SignerPayloadJSON, SignerPayloadRaw } from "@core/types/pjsInterop"
import { isJsonPayload } from "@core/util/isJsonPayload"

/**
 * The tip a dapp put on its own payload. It is paid in full to the block author on top of the
 * inclusion fee, which `TransactionPaymentApi.query_info` does not account for, so the sign screen
 * has to add it to what it tells the user the transaction costs.
 *
 * Returns 0 for anything unparseable, so a malformed tip can never understate the total.
 */
export const getPayloadTip = (
  payload: SignerPayloadJSON | SignerPayloadRaw | null | undefined
): bigint => {
  if (!payload || !isJsonPayload(payload) || !payload.tip) return 0n

  try {
    const tip = BigInt(payload.tip)
    return tip > 0n ? tip : 0n
  } catch (_err) {
    return 0n
  }
}
