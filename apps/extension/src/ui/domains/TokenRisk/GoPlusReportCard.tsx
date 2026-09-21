import type { Token } from "@talismn/chaindata-provider"
import goPlusLogo from "@ui/theme/images/goplus-logo.png"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import { getGoPlusReportUrl } from "./goPlusReport"
import { TOKEN_REPORT_BUTTON_CLASS_NAME, TokenReportCard } from "./TokenReportCard"

export const GoPlusReportLink: FC<{ reportUrl: string; className?: string }> = ({
  reportUrl,
  className,
}) => {
  const { t } = useTranslation()

  return (
    <a
      href={reportUrl}
      target="_blank"
      className={cn(
        TOKEN_REPORT_BUTTON_CLASS_NAME,
        "bg-primary-500/10 text-primary-500/80 hover:bg-primary-500/20 hover:text-primary",
        className
      )}
      rel="noopener"
    >
      <span>{t("View Report")}</span>
    </a>
  )
}

export const GoPlusReportCard: FC<{ token: Token | null | undefined; className?: string }> = ({
  token,
  className,
}) => {
  const { t } = useTranslation()
  const reportUrl = getGoPlusReportUrl(token)

  if (!reportUrl) return null

  return (
    <TokenReportCard
      className={className}
      logo={<img src={goPlusLogo} alt="" className="h-10 w-auto" />}
      title={t("GoPlus Token Analysis")}
      action={<GoPlusReportLink reportUrl={reportUrl} />}
    />
  )
}
