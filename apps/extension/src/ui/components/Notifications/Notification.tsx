import type { ErrorCategory } from "@common/analytics/errorCategory"
import { AlertCircleIcon, CheckCircleIcon, LoaderIcon, XCircleIcon } from "@talismn/icons"
import type { ReactNode } from "react"

type ToastBase = { title: ReactNode; subtitle?: ReactNode; right?: ReactNode }

type ErrorToastProps = ToastBase & { type: "error" } & (
    | { cause: unknown; errorCategory?: ErrorCategory }
    | { cause?: never; errorCategory: ErrorCategory }
  )

export type NotificationProps =
  | (ToastBase & { type: "success" | "processing" | "warn" })
  | ErrorToastProps

type NotificationType = NotificationProps["type"]

const NotificationIcon = ({ type }: { type: NotificationType }) => {
  if (type === "success") return <CheckCircleIcon className="h-16 w-16 text-alert-success" />
  if (type === "warn") return <AlertCircleIcon className="h-16 w-16 text-alert-warn" />
  if (type === "error") return <XCircleIcon className="h-16 w-16 text-alert-error" />
  if (type === "processing")
    return <LoaderIcon className="h-16 w-16 animate-spin-slow text-body-secondary" />
  return null
}

export const Notification = ({ title, subtitle, type, right }: NotificationProps) => {
  return (
    <div className="flex items-center gap-8">
      <div>
        <NotificationIcon type={type} />
      </div>
      <div className="grow">
        <div className="text-body">{title}</div>
        {subtitle && <div className="mt-2 text-body-secondary text-sm">{subtitle}</div>}
      </div>
      {right}
    </div>
  )
}
