import type { ErrorCategory } from "@common/analytics/errorCategory"
import { useFieldErrorShown } from "@ui/hooks/analytics/errorShown"
import { cn } from "@ui/util/cn"
import { type FC, type ReactNode, useRef } from "react"

type FormFieldContainerProps = {
  className?: string
  label?: ReactNode
  children: ReactNode
  error?: string | null
  noErrorRow?: boolean
  field?: string
  errorCategory?: ErrorCategory
}

export const FormFieldContainer: FC<FormFieldContainerProps> = ({
  className,
  label,
  children,
  error,
  noErrorRow,
  field,
  errorCategory = "input_invalid",
}) => {
  const root = useRef<HTMLDivElement>(null)
  useFieldErrorShown(noErrorRow ? null : error, root, { field, category: errorCategory })

  return (
    <div ref={root} className={cn("text-left text-base leading-base", className)}>
      <div className="text-body-secondary">{label}</div>
      <div className="mt-4">{children}</div>
      {!noErrorRow && (
        <div className="h-8 max-w-full overflow-hidden text-ellipsis whitespace-nowrap py-2 text-right text-alert-warn text-xs leading-none">
          {error}
        </div>
      )}
    </div>
  )
}
