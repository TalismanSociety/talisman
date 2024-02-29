import { AlertCircleIcon, CheckCircleIcon, LoaderIcon, XCircleIcon } from "@talismn/icons"
import { ReactNode } from "react"

type NotificationType = "success" | "error" | "processing" | "warn"

export type NotificationProps = {
  type: NotificationType
  title: ReactNode
  subtitle?: ReactNode
  right?: ReactNode
}

const NotificationIcon = ({ type }: { type: NotificationType }) => {
  if (type === "success") return <CheckCircleIcon className="text-alert-success h-16 w-16" />
  if (type === "warn") return <AlertCircleIcon className="text-alert-warn h-16 w-16" />
  if (type === "error") return <XCircleIcon className="text-alert-error h-16 w-16" />
  if (type === "processing")
    return <LoaderIcon className="text-body-secondary animate-spin-slow h-16 w-16" />
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
        {subtitle && <div className="text-body-secondary mt-2 text-sm">{subtitle}</div>}
      </div>
      {right}
    </div>
  )
}
