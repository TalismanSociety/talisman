import { classNames } from "@ui/util/cn"
import type { FC, ReactNode } from "react"

type FormFieldContainerProps = {
  className?: string
  label?: ReactNode
  children: ReactNode
  error?: string | null
  noErrorRow?: boolean
}

export const FormFieldContainer: FC<FormFieldContainerProps> = ({
  className,
  label,
  children,
  error,
  noErrorRow,
}) => {
  return (
    <div className={classNames("text-left text-base leading-base", className)}>
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
