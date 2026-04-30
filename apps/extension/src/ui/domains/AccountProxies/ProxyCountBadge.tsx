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

  return (
    <span
      className={cn(
        "inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-grey-700 px-2 text-body-secondary text-xs",
        className
      )}
      title={t("{{count}} proxy", { count })}
    >
      {count}
    </span>
  )
}
