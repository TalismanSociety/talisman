import { InfoIcon } from "@talismn/icons"

import { useWithdrawFundsContext } from "../WithdrawFundsProvider"

export const ValidationErrors = () => {
  const { error } = useWithdrawFundsContext()

  if (!error) return null

  const getErrorMessage = (err: unknown): string => {
    if (typeof err === "string") return err
    if (err instanceof Error) return err.message
    if (err && typeof err === "object" && "message" in err) {
      return String(err.message)
    }
    // Fallback: try to stringify or return a default message
    try {
      return JSON.stringify(err)
    } catch {
      return "An error occurred"
    }
  }

  return (
    <div className="flex items-center gap-2">
      <InfoIcon className="text-alert-error h-6 w-6" />
      <span className="text-alert-error text-sm">{getErrorMessage(error)}</span>
    </div>
  )
}
