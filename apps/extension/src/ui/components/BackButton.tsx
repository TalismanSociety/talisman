import { ChevronLeftIcon } from "@talismn/icons"
import { cn } from "@ui/util/cn"
import { type ButtonHTMLAttributes, type DetailedHTMLProps, type FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { type To, useNavigate } from "react-router-dom"

type BackButtonProps = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  to?: string
}

export const BackButton: FC<BackButtonProps> = ({ children, to, ...props }) => {
  const navigate = useNavigate()

  const handleBackClick = useCallback(() => {
    navigate(to ?? (-1 as To))
  }, [navigate, to])

  const { t } = useTranslation()

  return (
    <button
      type="button"
      {...props}
      onClick={handleBackClick}
      className={cn(
        "allow-focus inline-flex items-center gap-2 rounded-sm bg-grey-850 py-3 pr-4 pl-2 text-grey-400 text-sm hover:bg-grey-800 hover:text-grey-300",
        props.className
      )}
    >
      <ChevronLeftIcon />
      <span>{children ?? t("Back")}</span>
    </button>
  )
}
