import { ZapFastIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC } from "react"
import { useTranslation } from "react-i18next"

import { useEarnModal } from "./hooks/useEarnModal"

interface EarnPillButtonProps {
  tokenId: string
  onClick?: () => void
  className?: string
}

export const EarnPillButton: FC<EarnPillButtonProps> = ({ tokenId, onClick, className }) => {
  const { t } = useTranslation()
  const { open } = useEarnModal()

  const handleClick = () => {
    // Open the modal with the actual tokenId
    open({ tokenId })
    // Call the optional onClick prop if provided
    onClick?.()
  }

  return (
    <button
      className={classNames(
        "h-16 rounded-[28px] bg-[#D5FF5C]/10 px-4 text-sm font-light text-[#D5FF5C] hover:bg-[#D5FF5C]/20",
        className,
      )}
      type="button"
      onClick={handleClick}
    >
      <div className="flex items-center gap-2">
        <ZapFastIcon className="shrink-0 text-base" />
        <div>{t("Earn")}</div>
      </div>
    </button>
  )
}
