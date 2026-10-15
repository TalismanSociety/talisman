import { log } from "@common/log"
import type { RequestSolanaSignCancel } from "@core/domains/solana/exports"
import { api } from "@ui/api"

export const rejectSolanaRequest = async (id: RequestSolanaSignCancel["id"]) => {
  try {
    await api.solSignCancel(id)
  } catch (cause) {
    log.warn("[solana] failed to cancel sign request", { cause })
  }
  window.close()
}
