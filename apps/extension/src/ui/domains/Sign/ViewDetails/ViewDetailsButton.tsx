import { FileSearchIcon, LoaderIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

type ViewDetailsButtonProps = {
  hide?: boolean
  onClick: () => void
  isAnalysing?: boolean
  hasError?: boolean
  className?: string
}

export const ViewDetailsButton: FC<ViewDetailsButtonProps> = ({
  onClick,
  hide,
  className,
  isAnalysing = false,
  hasError = false,
}) => {
  const { t } = useTranslation("request")
  const [hasClickRequest, setHasClickRequest] = useState(false)

  const handleClick = useCallback(() => {
    setHasClickRequest(true)
    if (onClick) onClick()
  }, [onClick])

  return (
    <button
      type="button"
      onClick={handleClick}
      className={classNames(
        "text-body-disabled hover:text-body-secondary flex items-center gap-2",
        className,
        hasError && "text-alert-warn",
        hide && "hidden"
      )}
    >
      {hasClickRequest && isAnalysing ? (
        <>
          <LoaderIcon className="animate-spin-slow text-base" />
          <span className="text-xs">{t("Decoding...")}</span>
        </>
      ) : (
        <>
          <FileSearchIcon className="text-base" />
          <span className="text-xs">{t("View Details")}</span>
        </>
      )}
    </button>
  )
}
