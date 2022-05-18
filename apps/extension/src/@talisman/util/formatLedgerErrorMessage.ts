export type LedgerErrorStatus = "warning" | "error"

const capitalize = (str: string) => (str.length > 1 ? str[0].toUpperCase() + str.slice(1) : str)

const messagesMap = new Map([
  ["Unexpected call index", "This type of transaction is not supported on this Ledger app"],
  [
    "Unable to claim interface.",
    "Your Ledger device is being accessed in another browser window. Please close this window and complete the other session.",
  ],
  [
    "NetworkError: A transfer error has occurred.",
    "Failed to communicate with Ledger. Please restart your browser and try again.",
  ],
  [
    "Access denied.",
    "Failed to communicate with Ledger. Please restart your browser and try again.",
  ],
])

interface LedgerError {
  status: LedgerErrorStatus
  message: string
  requiresManualRetry: boolean
}
export const formatLedgerErrorMessage = (
  ledgerError: string,
  network: string = "the network"
): LedgerError => {
  if (ledgerError?.includes("Code: 26628") || ledgerError?.includes("Transaction rejected"))
    return {
      status: "warning",
      message: "Please unlock your Ledger.",
      requiresManualRetry: false,
    }

  if (ledgerError?.includes("App does not seem to be open") || ledgerError?.includes("28161"))
    return {
      status: "warning",
      message: `Please open <strong>${capitalize(network)}</strong> app on your Ledger.`,
      requiresManualRetry: false,
    }

  if (
    ledgerError ===
    "Failed to execute 'requestDevice' on 'USB': Must be handling a user gesture to show a permission request."
  )
    return {
      status: "error",
      message: "Failed to connect to your Ledger. Click here to retry.",
      requiresManualRetry: true,
    }
  if (messagesMap.get(ledgerError))
    return {
      status: "error",
      message: messagesMap.get(ledgerError) as string,
      requiresManualRetry: false,
    }

  return { status: "error", message: ledgerError, requiresManualRetry: false }
}

export const formatLedgerSigningError = (
  err: string,
  network: string = "the network"
): LedgerError => {
  switch (err) {
    case "Transaction rejected":
      return {
        status: "error",
        message: `Transaction rejected. Click here to try again.`,
        requiresManualRetry: true,
      }
    case "Txn version not supported":
      return {
        status: "error",
        message: `Ledger app <strong>${network}</strong> is outdated. Please update it using Ledger Live.`,
        requiresManualRetry: false,
      }
    default:
      return {
        status: "error",
        message: err,
        requiresManualRetry: false,
      }
  }
}
