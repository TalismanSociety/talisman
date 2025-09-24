import { XIcon } from "@talismn/icons"
import { FC } from "react"
import { useTranslation } from "react-i18next"

interface EarnModalHeaderProps {
  onClose: () => void
}

export const EarnModalHeader: FC<EarnModalHeaderProps> = ({ onClose }) => {
  const { t } = useTranslation()

  return (
    <div className="relative flex items-center justify-center pb-4">
      <h2 className="text-base font-[650] text-white">{t("Select a Product")}</h2>
      <button
        onClick={onClose}
        className="absolute right-6 text-gray-400 transition-colors hover:text-white"
      >
        <XIcon size={24} />
      </button>
    </div>
  )
}
