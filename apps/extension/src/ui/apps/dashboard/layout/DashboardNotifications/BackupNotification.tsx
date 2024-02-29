import { InfoIcon } from "@talismn/icons"
import { XIcon } from "@talismn/icons"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useCallback } from "react"
import { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { IconButton, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

type NotificationProps = {
  icon: ReactNode
  title?: ReactNode
  description?: ReactNode
  onClose?: () => void
  children?: ReactNode
}

export const DashboardNotification = ({
  icon,
  title,
  description,
  onClose,
  children,
}: NotificationProps) => {
  return (
    <div className="bg-grey-900 mb-12 flex w-full items-center justify-between gap-6 rounded border border-white p-8 text-base">
      <div className="flex gap-6">
        <div className="text-primary flex flex-col justify-center text-[3.8rem]">{icon}</div>
        <div className="flex flex-col">
          <span className="mr-4">{title}</span>
          <span className="text-body-secondary">{description}</span>
        </div>
      </div>
      <div className="">{children}</div>
      {onClose && (
        <IconButton onClick={onClose}>
          <XIcon />
        </IconButton>
      )}
    </div>
  )
}

export const BackupNotification = () => {
  const { t } = useTranslation()

  const navigate = useNavigate()
  const { showBackupWarningBanner, notBackedUpCount, snoozeBackupReminder } = useMnemonicBackup()

  const handleBackupNowClick = useCallback(() => {
    navigate("/settings/mnemonics?showBackupModal")
  }, [navigate])

  if (!showBackupWarningBanner) return null

  return (
    <DashboardNotification
      icon={<InfoIcon />}
      title={
        notBackedUpCount === 1
          ? t("Recovery phrase not backed up", { count: notBackedUpCount })
          : t("{{ count }} recovery phrases not backed up", { count: notBackedUpCount })
      }
      description={t(
        "If you don't backup your recovery phrases, you may lose access to all your funds."
      )}
    >
      <span className="flex flex-col gap-4 md:flex-row">
        <Tooltip>
          <TooltipTrigger
            className="h-[3rem] rounded-xl border border-white px-8 py-2 !text-sm"
            onClick={snoozeBackupReminder}
          >
            {t("Snooze")}
          </TooltipTrigger>

          <TooltipContent>{t("Snooze for 3 days")}</TooltipContent>
        </Tooltip>
        <button
          type="button"
          className="bg-primary h-[3rem] whitespace-nowrap rounded-xl px-8 py-2 !text-sm text-black"
          onClick={handleBackupNowClick}
        >
          {t("Backup Now")}
        </button>
      </span>
    </DashboardNotification>
  )
}
