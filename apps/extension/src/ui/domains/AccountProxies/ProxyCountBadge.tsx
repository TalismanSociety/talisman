import { useAccountProxiesCount } from "@ui/state/accountProxies"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

type Props = {
  address: string | null | undefined
  className?: string
}

/**
 * Small pill showing how many proxies the wallet account at `address` has on
 * substrate networks. Hidden when the count is zero.
 */
export const ProxyCountBadge: FC<Props> = ({ address, className }) => {
  const { t } = useTranslation()
  const count = useAccountProxiesCount(address)

  if (!count) return null

  const label = count === 1 ? t("{{count}} proxy", { count }) : t("{{count}} proxies", { count })

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm bg-primary/10 px-4 py-1.5 text-primary text-sm",
        className
      )}
    >
      {label}
    </span>
  )
}
