import { classNames } from "@talismn/util"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

const Pill = ({ className, children }: { className?: string; children?: ReactNode }) => (
  <div
    className={classNames(
      "inline-block rounded bg-primary/10 p-4 font-light text-primary text-xs",
      className
    )}
  >
    {children}
  </div>
)

export const TestnetPill = () => {
  const { t } = useTranslation()
  return <Pill className="bg-alert-warn/10 text-alert-warn">{t("Testnet")}</Pill>
}

export const CustomPill = () => {
  const { t } = useTranslation()
  return <Pill>{t("Custom")}</Pill>
}
