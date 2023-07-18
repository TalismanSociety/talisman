import { classNames } from "@talismn/util"
import { FC, ReactNode } from "react"

export type ViewDetailsFieldProps = {
  label: ReactNode
  prewrap?: boolean
  breakAll?: boolean
  error?: string
  children?: ReactNode
}

export const ViewDetailsField: FC<ViewDetailsFieldProps> = ({ label, children, error }) =>
  error || children ? (
    <div className="mt-4">
      <div className="text-body-secondary">{label}</div>
      <div className={classNames(error && "text-alert-warn")}>{error || children}</div>
    </div>
  ) : null
