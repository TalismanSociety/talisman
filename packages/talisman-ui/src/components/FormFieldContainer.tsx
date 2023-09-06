import { classNames } from "@talismn/util"
import { FC, ReactNode } from "react"

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
    <div className={classNames("leading-base text-left text-base", className)}>
      <div className="text-body-secondary">{label}</div>
      <div className="mt-4">{children}</div>
      {!noErrorRow && (
        <div className="text-alert-warn h-8 max-w-full overflow-hidden text-ellipsis whitespace-nowrap py-2 text-right text-xs leading-none">
          {error}
        </div>
      )}
    </div>
  )
}
