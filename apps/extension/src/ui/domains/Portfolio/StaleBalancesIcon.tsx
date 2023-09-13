import { WithTooltip } from "@talisman/components/Tooltip"
import { AlertTriangleIcon } from "@talismn/icons"
import { useTranslation } from "react-i18next"

export type Props = { className?: string; staleChains?: string[] }
export const StaleBalancesIcon = ({ className, staleChains = [] }: Props) => {
  const { t } = useTranslation()

  if (staleChains.length < 1) return null

  const namedChain = staleChains.slice(0, 1)

  const chainOrChains = staleChains.length === 2 ? t("chain") : t("chains")
  const nMoreChains = Math.max(0, staleChains.length - 1)
  const andNMore =
    nMoreChains > 0
      ? " " + t("and {{nMoreChains}} more {{chainOrChains}}", { nMoreChains, chainOrChains })
      : ""

  const tooltipText = t(
    `Latest balance is not available for {{chains}}.\nDisplayed value may be out of date.`,
    { chains: namedChain + andNMore }
  )
  const tooltip = <span className="whitespace-pre-wrap">{tooltipText}</span>

  return (
    <WithTooltip tooltip={tooltip}>
      <AlertTriangleIcon className={className} />
    </WithTooltip>
  )
}
