import { AlertTriangleIcon, ChevronRightIcon } from "@talismn/icons"
import { formatPrice } from "@talismn/util"
import { useMnemonicsAllBackedUp } from "@ui/hooks/useMnemonicsAllBackedUp"
import { useSelectedCurrency } from "@ui/state/settings"
import { cn } from "@ui/util/cn"
import type { CSSProperties, FC } from "react"
import { useTranslation } from "react-i18next"

import type { AModeShortcut } from "./types"
import { type AModeTickerItem, useAModeTicker } from "./useAModeTicker"

const SECONDS_PER_ITEM = 5

const formatChange = (change24h: number) =>
  new Intl.NumberFormat(undefined, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: "exceptZero",
  }).format(change24h / 100)

const TickerItem: FC<{ item: AModeTickerItem; currency: string }> = ({ item, currency }) => (
  <li className="flex shrink-0 items-center gap-2 whitespace-nowrap px-6 text-xs">
    <span className="font-bold text-body">{item.symbol}</span>
    <span className="text-body-secondary">{formatPrice(item.price, currency, true)}</span>
    {item.change24h !== null && (
      <span
        className={cn(
          item.change24h > 0 && "text-price-up",
          item.change24h < 0 && "text-price-down",
          item.change24h === 0 && "text-body-inactive"
        )}
      >
        {formatChange(item.change24h)}
      </span>
    )}
  </li>
)

const BackupNotice: FC<{ shortcut: AModeShortcut }> = ({ shortcut }) => {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      data-testid="a-mode-backup-notice"
      onClick={shortcut.onClick}
      className={cn(
        "flex h-full shrink-0 items-center gap-2 border-grey-800 border-r px-6 text-alert-warn text-xs",
        "hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2"
      )}
    >
      <AlertTriangleIcon className="size-8 shrink-0" aria-hidden />
      <span className="whitespace-nowrap">{t("Back up your recovery phrase")}</span>
      <ChevronRightIcon className="size-8 shrink-0" aria-hidden />
    </button>
  )
}

export const AModeTicker: FC<{ recoveryPhrases?: AModeShortcut }> = ({ recoveryPhrases }) => {
  const { t } = useTranslation()
  const { items, isHoldings } = useAModeTicker()
  const currency = useSelectedCurrency()
  const allBackedUp = useMnemonicsAllBackedUp()
  const showNotice = !allBackedUp && !!recoveryPhrases

  if (!items.length && !showNotice) return null

  const style = { "--marquee-duration": `${items.length * SECONDS_PER_ITEM}s` } as CSSProperties

  return (
    <div
      data-testid="a-mode-ticker"
      className="flex h-16 w-full min-w-0 items-center overflow-hidden rounded-sm bg-grey-900 [contain:inline-size]"
    >
      {showNotice && <BackupNotice shortcut={recoveryPhrases} />}
      {!!items.length && (
        <section
          // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users scroll this region under reduced motion, and focus pauses the scroll
          tabIndex={0}
          aria-label={isHoldings ? t("Prices of your tokens") : t("Prices of major tokens")}
          className={cn(
            "group h-full min-w-0 flex-1 overflow-hidden focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2",
            "motion-reduce:no-scrollbar motion-reduce:overflow-x-auto"
          )}
        >
          <div
            style={style}
            className={cn(
              "flex h-full w-max items-center",
              "motion-safe:animate-marquee group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused]"
            )}
          >
            <ul className="flex items-center" data-testid="a-mode-ticker-items">
              {items.map((item) => (
                <TickerItem key={item.tokenId} item={item} currency={currency} />
              ))}
            </ul>
            {/* second copy makes the loop seamless, the reduced motion row does not need it */}
            <ul className="flex items-center motion-reduce:hidden" aria-hidden>
              {items.map((item) => (
                <TickerItem key={item.tokenId} item={item} currency={currency} />
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}
