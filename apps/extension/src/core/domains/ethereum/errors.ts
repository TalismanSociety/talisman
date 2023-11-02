import { ethers } from "ethers"

export const getEthersErrorLabelFromCode = (code?: string | number) => {
  if (typeof code === "string") {
    switch (code) {
      // operational errors
      case ethers.errors.BUFFER_OVERRUN:
        return "Buffer overrun"
      case ethers.errors.NUMERIC_FAULT:
        return "Numeric fault"

      // argument errors
      case ethers.errors.UNEXPECTED_ARGUMENT:
        return "Too many arguments"
      case ethers.errors.MISSING_ARGUMENT:
        return "Missing argument"
      case ethers.errors.INVALID_ARGUMENT:
        return "Invalid argument"
      case ethers.errors.MISSING_NEW:
        return "Missing constructor"

      // interactions errors
      case ethers.errors.ACTION_REJECTED:
        return "Action rejected"

      // blockchain errors
      case ethers.errors.CALL_EXCEPTION:
        return "Contract method failed to execute"
      case ethers.errors.INSUFFICIENT_FUNDS:
        return "Insufficient balance"
      case ethers.errors.NONCE_EXPIRED:
        return "Nonce expired"
      case ethers.errors.UNPREDICTABLE_GAS_LIMIT:
        // TODO could be gas limit to low, parameters making the operation impossible, balance to low to pay for gas, or anything else that makes the operation impossible to succeed.
        // TODO need a better copy to explain this, but gas limit issue has to be stated as it can be solved by the user.
        return "Transaction may fail because of insufficient balance, incorrect parameters or may require higher gas limit"
      case ethers.errors.TRANSACTION_REPLACED:
        return "Transaction was replaced with another one with higher gas price"
      case ethers.errors.REPLACEMENT_UNDERPRICED:
        return "Replacement fee is too low, try again with higher gas price"

      // generic errors
      case ethers.errors.NETWORK_ERROR:
        return "Network error"
      case ethers.errors.UNSUPPORTED_OPERATION:
        return "Unsupported operation"
      case ethers.errors.NOT_IMPLEMENTED:
        return "Not implemented"
      case ethers.errors.TIMEOUT:
        return "Timeout exceeded"
      case ethers.errors.SERVER_ERROR:
        return "Server error"
      case ethers.errors.UNKNOWN_ERROR:
      default:
        return "Unknown error"
    }
  }

  // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1474.md
  if (typeof code === "number") {
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
      default:
        return "Unknown error"
    }
  }

  return undefined
}

// turns errors into short and human readable message.
// main use case is teling the user why a transaction failed without going into details and clutter the UI
export const getHumanReadableErrorMessage = (error: unknown) => {
  const {
    code,
    reason,
    error: serverError,
    shortMessage,
    details,
  } = error as {
    code?: string
    reason?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error?: any
    shortMessage?: string
    details?: string
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

  return getEthersErrorLabelFromCode(code)
}
