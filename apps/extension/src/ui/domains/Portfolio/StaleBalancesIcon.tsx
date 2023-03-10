import { WithTooltip } from "@talisman/components/Tooltip"
import { AlertTriangleIcon } from "@talisman/theme/icons"
import { Balances } from "@talismn/balances"
import uniq from "lodash/uniq"

export const getStale = (balances: Balances): string[] =>
  uniq(
    balances.sorted
      .filter((b) => b.status === "stale")
      .map((b) => b.chain?.name ?? b.chainId ?? "Unknown")
  )

export type Props = { className?: string; stale?: string[] }
export const StaleBalancesIcon = ({ className, stale = [] }: Props) => {
  if (stale.length < 1) return null

  const namedChain = stale.slice(0, 1)

  const chainOrChains = stale.length === 2 ? "chain" : "chains"
  const nMoreChains = Math.max(0, stale.length - 1)
  const andNMore = nMoreChains > 0 ? ` and ${nMoreChains} more ${chainOrChains}` : ""

  const tooltipText = `Latest balance is not available for ${namedChain}${andNMore}.\nDisplayed value may be out of date.`
  const tooltip = <span className="whitespace-pre-wrap">{tooltipText}</span>

  return (
    <WithTooltip tooltip={tooltip}>
      <AlertTriangleIcon className={className} />
    </WithTooltip>
  )
}
