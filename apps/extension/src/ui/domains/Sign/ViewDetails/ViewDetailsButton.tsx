import { LoaderIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { FC, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { PillButton } from "talisman-ui"

type ViewDetailsButtonProps = {
  hide?: boolean
  onClick: () => void
  isAnalysing?: boolean
  hasError?: boolean
}

export const ViewDetailsButton: FC<ViewDetailsButtonProps> = ({
  onClick,
  hide,
  isAnalysing = false,
  hasError = false,
}) => {
  const { t } = useTranslation("request")
  const [hasClickRequest, setHasClickRequest] = useState(false)

  const handleClick = useCallback(() => {
    setHasClickRequest(true)
    if (onClick) onClick()
  }, [onClick])

  if (hasClickRequest && isAnalysing)
    return (
      <span className="text-body-disabled inline-flex h-16 items-center text-sm">
        <LoaderIcon className="text-body-secondary animate-spin-slow" />
        <span className="ml-2">{t("Decoding...")}</span>
      </span>
    )

  return (
    <PillButton
      className={classNames(hasError && "text-alert-warn", hide && "hidden")}
      onClick={handleClick}
    >
      {t("View Details")}
    </PillButton>
  )
}
