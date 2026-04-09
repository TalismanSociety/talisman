import { YIELD_API_BASE_URL } from "@common/constants"
import { log } from "@common/log"
import type { ActionDto, TransactionDto } from "@core/domains/earn/exports"

export const fetchYieldxyzAction = async (
  actionId: string,
  signal?: AbortSignal
): Promise<ActionDto> => {
  const req = await fetch(`${YIELD_API_BASE_URL}/v1/actions/${actionId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal,
  })

  if (!req.ok) throw new Error(await getErrorMessage(req))

  return req.json()
}

export const submitYieldxyzTransactionHash = async (
  transactionId: string,
  hash: string,
  signal?: AbortSignal
): Promise<ActionDto["transactions"][number]> => {
  const req = await fetch(`${YIELD_API_BASE_URL}/v1/transactions/${transactionId}/submit-hash`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hash }),
    signal,
  })

  if (!req.ok) throw new Error(await getErrorMessage(req))

  return req.json()
}

export const getErrorMessage = async (response: Response): Promise<string> => {
  try {
    const errorBody = await response.json()
    return errorBody.message || `Yield.xyz API error: ${response.status} ${response.statusText}`
  } catch {
    return `Yield.xyz API error: ${response.status} ${response.statusText}`
  }
}

export const sortTransactionsByStepIndex = (a: TransactionDto, b: TransactionDto) => {
  if (a.stepIndex === undefined || b.stepIndex === undefined) {
    log.warn("sortTransactionsByStepIndex: transaction missing stepIndex", { a, b })
    return 0
  }

  return a.stepIndex - b.stepIndex
}
