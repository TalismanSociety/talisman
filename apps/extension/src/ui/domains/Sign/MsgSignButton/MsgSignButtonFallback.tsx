import { Button } from "@ui/components/Button"
import { classNames } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

export const MsgSignButtonFallback: FC<{ label?: string; className?: string }> = ({
  label,
  className,
}) => {
  const { t } = useTranslation()

  return (
    <Button className={classNames("w-full", className)} primary disabled>
      {label ?? t("Sign")}
    </Button>
  )
}
