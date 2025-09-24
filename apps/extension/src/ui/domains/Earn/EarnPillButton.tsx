import { EarnIcon } from "@talismn/icons"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { PillButton } from "talisman-ui"

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
    <PillButton
      icon={EarnIcon}
      size="xs"
      onClick={handleClick}
      className={`bg-[#D5FF5C]/10 text-[#D5FF5C] hover:bg-[#D5FF5C]/20 ${className || ""}`}
    >
      {t("Earn")}
    </PillButton>
  )
}
