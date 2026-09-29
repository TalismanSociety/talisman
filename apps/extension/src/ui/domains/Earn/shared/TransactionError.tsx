import { AlertCircleIcon } from "@talismn/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import type { FC } from "react"

export const TransactionError: FC<{ error?: string; errorDetails?: string }> = ({
  error,
  errorDetails,
}) => {
  if (!error) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="text-center text-brand-orange text-xs">
          <AlertCircleIcon className="inline-block align-text-top text-sm" /> {error}
        </div>
      </TooltipTrigger>
      {!!errorDetails && <TooltipContent>{errorDetails}</TooltipContent>}
    </Tooltip>
  )
}
