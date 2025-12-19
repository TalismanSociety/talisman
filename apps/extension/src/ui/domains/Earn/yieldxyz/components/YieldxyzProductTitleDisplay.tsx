import { YieldDto } from "extension-core"
import { FC } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

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
