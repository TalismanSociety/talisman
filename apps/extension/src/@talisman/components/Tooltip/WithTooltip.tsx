import { ReactNode } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

type TooltipContainerProps = {
  tooltip: ReactNode
  children: ReactNode
  as?: "span" | "div"
  className?: string
  noWrap?: boolean //deprecated
}

/**
 * @deprecated prefer <Tooltip> component which provides better control over HTML output
 * */
export const WithTooltip = ({
  tooltip,
  children,
  as: Container = "span",
  className,
}: TooltipContainerProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Container className={className}>{children}</Container>
      </TooltipTrigger>
      {!!tooltip && <TooltipContent>{tooltip}</TooltipContent>}
    </Tooltip>
  )
}
