import { InfoIcon } from "@talismn/icons"

import { useDepositFunds } from "../useDepositFunds"

export const ValidationErrors = () => {
  const { validationErrors } = useDepositFunds()

  if (validationErrors.length === 0) return null

  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
      <InfoIcon className="h-4 w-4 text-red-400" />
      <span className="text-sm text-red-300">{validationErrors[0]}</span>
    </div>
  )
}
