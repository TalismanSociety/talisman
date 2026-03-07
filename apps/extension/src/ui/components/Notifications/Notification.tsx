import { AlertCircleIcon, CheckCircleIcon, LoaderIcon, XCircleIcon } from "@talismn/icons"
import type { ReactNode } from "react"

type NotificationType = "success" | "error" | "processing" | "warn"

export type NotificationProps = {
  type: NotificationType
  title: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
}

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
