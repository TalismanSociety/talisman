import { log } from "@core/log"

export const getEthersErrorLabelFromCode = (code: number) => {
  // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1474.md
  switch (code) {
    case -32700:
      return "Parse error. Invalid JSON was received by the server"
    case -32600:
      return "Invalid request, it could not be understood by the server"
    case -32601:
      return "Method does not exist"
    case -32602:
      return "Invalid method parameters"
    case -32603:
      return "Internal JSON-RPC error"
    case -32000:
      return "Missing or invalid parameters"
    case -32001:
      return "Requested resource not found"
    case -32002:
      return "Requested resource is not available"
    case -32003:
      return "Transaction rejected"
    case -32004:
      return "Method is not implemented"
    case -32005:
      return "Request exceeds defined limit"
    case -32006:
      return "Transaction not yet known"
    default: {
      log.warn("Unknown error code", { code })
      return "Unknown error"
    }
  }
}

// turns errors into short and human readable message.
// main use case is teling the user why a transaction failed without going into details and clutter the UI
export const getHumanReadableErrorMessage = (error: unknown) => {
  if (!error) return undefined

  const {
    reason,
    error: serverError,
    shortMessage,
    details,
    code,
  } = error as {
    reason?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error?: any
    shortMessage?: string
    details?: string
    code?: number
  }

  if (details) return details

  if (shortMessage) return shortMessage

  if (serverError) {
    const message = serverError.error?.message ?? serverError.reason ?? serverError.message
    return message
      .replace("VM Exception while processing transaction: reverted with reason string ", "")
      .replace("VM Exception while processing transaction: revert", "")
      .replace("VM Exception while processing transaction:", "")
      .trim()
  }

  if (reason === "processing response error") return "Invalid transaction"

  if (reason) return reason

  if (code) return getEthersErrorLabelFromCode(code)
}
