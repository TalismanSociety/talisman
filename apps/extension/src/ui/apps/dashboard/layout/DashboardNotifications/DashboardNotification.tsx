import { IconButton } from "@talisman/components/IconButton"
import { XIcon } from "@talisman/theme/icons"
import { ReactNode } from "react"

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
    <div className="bg-grey-900 flex w-full items-center gap-6 rounded border border-white p-8 text-base">
      {icon && (
        <div className="text-primary flex flex-col justify-center text-[3.8rem]">{icon}</div>
      )}
      <div className="grow">
        <div className="inline">{title}</div>
        <div className="text-body-secondary inline">{description}</div>
      </div>
      {action && (
        <button
          className="bg-primary h-[3rem] whitespace-nowrap rounded-xl py-2 px-8 !text-sm text-black"
          onClick={onActionClick}
        >
          {action}
        </button>
      )}
      <IconButton onClick={onClose}>
        <XIcon />
      </IconButton>
    </div>
  )
}
