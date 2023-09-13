import { classNames } from "@talismn/util"
import { ReactNode } from "react"
import { useTranslation } from "react-i18next"

const Pill = ({ className, children }: { className?: string; children?: ReactNode }) => (
  <div
    className={classNames(
      "bg-primary/10 text-primary inline-block rounded p-4 text-xs font-light",
      className
    )}
  >
    {children}
  </div>
)

export const TestnetPill = () => {
  const { t } = useTranslation("admin")
  return <Pill className="bg-alert-warn/10 text-alert-warn">{t("Testnet")}</Pill>
}

export const CustomPill = () => {
  const { t } = useTranslation("admin")
  return <Pill>{t("Custom")}</Pill>
}
