import { Button } from "@ui/components/Button"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

const DefiMovedIllustration: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 140 90" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect
      x="42"
      y="8"
      width="72"
      height="32"
      rx="16"
      stroke="rgba(255,255,255,0.15)"
      strokeWidth="1"
    />
    <circle cx="98" cy="24" r="10" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
    <circle cx="98" cy="24" r="5" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
    <circle cx="98" cy="24" r="2" fill="rgba(255,255,255,0.15)" />
    <rect
      x="26"
      y="48"
      width="72"
      height="32"
      rx="16"
      stroke="rgba(255,255,255,0.15)"
      strokeWidth="1"
    />
    <circle cx="42" cy="64" r="10" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
    <circle cx="42" cy="64" r="5" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
    <circle cx="42" cy="64" r="2" fill="rgba(255,255,255,0.15)" />
  </svg>
)

export const PortfolioDefiContent: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-8 rounded bg-grey-850 py-24",
        className
      )}
    >
      <div className="flex flex-col items-center justify-center gap-4">
        <DefiMovedIllustration className="h-36 w-56" />
        <div className="text-body-secondary">{t("DeFi has moved to Earn")}</div>
      </div>
      <Button primary small className="px-24" onClick={() => navigate("/earn/positions")}>
        {t("Go to Earn")}
      </Button>
    </div>
  )
}
