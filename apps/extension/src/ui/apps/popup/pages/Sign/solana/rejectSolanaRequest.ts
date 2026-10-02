import type { RequestSolanaSignCancel } from "@core/domains/solana/exports"
import { api } from "@ui/api"

/** Records the rejection before the window closes: closing it alone reads as no decision. */
export const rejectSolanaRequest = async (id: RequestSolanaSignCancel["id"]) => {
  try {
    await api.solSignCancel(id)
  } catch {
    // the request is gone already: closing the window is all that is left
  }
  window.close()
}
