import { classNames } from "@talismn/util"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

export const TxSubmitButtonFallback: FC<{ label?: string; className?: string }> = ({
  label,
  className,
}) => {
  const { t } = useTranslation()

  return (
    <Button className={classNames("w-full", className)} primary disabled>
      {label ?? t("Confirm")}
    </Button>
  )
}
