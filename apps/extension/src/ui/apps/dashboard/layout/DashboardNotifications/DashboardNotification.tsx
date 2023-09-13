import { XIcon } from "@talismn/icons"
import { ReactNode } from "react"
import { IconButton } from "talisman-ui"

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
    <div className="bg-grey-900 mb-12 flex w-full items-center gap-6 rounded border border-white p-8 text-base">
      {icon && (
        <div className="text-primary flex flex-col justify-center text-[3.8rem]">{icon}</div>
      )}
      <div className="flex-grow">
        <span className="mr-4">{title}</span>
        <span className="text-body-secondary">{description}</span>
      </div>
      {action && (
        <button
          type="button"
          className="bg-primary h-[3rem] whitespace-nowrap rounded-xl px-8 py-2 !text-sm text-black"
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
