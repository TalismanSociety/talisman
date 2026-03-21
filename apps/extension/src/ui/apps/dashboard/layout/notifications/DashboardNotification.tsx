import { XIcon } from "@talismn/icons"
import { IconButton } from "@ui/components/IconButton"
import type { ReactNode } from "react"

type NotificationProps = {
  icon?: ReactNode
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  onActionClick: () => void
  onClose?: () => void
}

export const DashboardNotification = ({
  icon,
  title,
  description,
  onClose,
  action,
  onActionClick,
}: NotificationProps) => {
  return (
    <div className="mb-12 flex w-full items-center gap-6 rounded border border-white bg-grey-900 p-8 text-base">
      {icon && (
        <div className="flex flex-col justify-center text-[2.375rem] text-primary">{icon}</div>
      )}
      <div className="grow">
        <span className="mr-4">{title}</span>
        <span className="text-body-secondary">{description}</span>
      </div>
      {action && (
        <button
          type="button"
          className="h-[1.875rem] whitespace-nowrap rounded-xl bg-primary px-8 py-2 text-black text-sm!"
          onClick={onActionClick}
        >
          {action}
        </button>
      )}
      {onClose && (
        <IconButton onClick={onClose}>
          <XIcon />
        </IconButton>
      )}
    </div>
  )
}
