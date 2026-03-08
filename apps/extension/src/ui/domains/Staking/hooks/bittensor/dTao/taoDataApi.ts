import { getTaoDataApi } from "@core/domains/bittensor/exports"
import { gandalfFetch } from "@ui/util/gandalfFetch"

export const taoDataApi = getTaoDataApi(gandalfFetch)

type TaoDataApiErrorPayload = {
  error?: {
    message?: string
    code?: string
  }
}

export type TaoDataApiClientError = Error & {
  status?: number
}

const getErrorMessage = (error: unknown): string | undefined => {
  if (error instanceof Error && error.message) return error.message

  if (typeof error === "object" && error !== null) {
    const payload = (error as { error?: TaoDataApiErrorPayload["error"] }).error
    if (payload?.message) return payload.message
    if (typeof payload?.code === "string") return payload.code
  }

  return undefined
}

export const toTaoDataApiError = (
  error: unknown,
  fallbackMessage: string
): TaoDataApiClientError => {
  const message = getErrorMessage(error) ?? fallbackMessage
  const normalizedError = new Error(message) as TaoDataApiClientError

  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status
    if (typeof status === "number") normalizedError.status = status
  }

  return normalizedError
}

export const shouldRetryTaoDataApiError = (failureCount: number, error: unknown): boolean => {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? (error as { status?: unknown }).status
      : undefined

  if (typeof status === "number" && status >= 400 && status < 500 && status !== 429) {
    return false
  }

  return failureCount < 2
}
