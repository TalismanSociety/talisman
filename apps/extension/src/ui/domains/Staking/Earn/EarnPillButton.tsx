import { EarnIcon } from "@talismn/icons"
import { FC } from "react"
import { useTranslation } from "react-i18next"

interface EarnPillButtonProps {
  onClick?: () => void
  className?: string
}

export const EarnPillButton: FC<EarnPillButtonProps> = ({ onClick, className = "" }) => {
  const { t } = useTranslation()

  return (
    <button
      onClick={onClick}
      className={`flex h-[32px] w-[83px] items-center gap-4 rounded-[37px] bg-[#D5FF5C]/10 p-8 font-normal transition-colors hover:bg-[#D5FF5C]/20 ${className}`}
    >
      <EarnIcon />
      <span className="text-xs font-medium text-[#D5FF5C]">{t("Earn")}</span>
    </button>
  )
}
