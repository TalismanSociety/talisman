import type { YieldDto } from "@core/domains/earn/exports"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import type { FC } from "react"

export const YieldxyzProductTitleDisplay: FC<{ product: YieldDto; className?: string }> = ({
  product,
  className,
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={className}>{product.metadata.name}</span>
      </TooltipTrigger>
      {!!product.metadata.description && (
        <TooltipContent>{product.metadata.description}</TooltipContent>
      )}
    </Tooltip>
  )
}
