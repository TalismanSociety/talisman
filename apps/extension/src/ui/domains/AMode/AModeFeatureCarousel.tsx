import { cn } from "@ui/util/cn"
import { type FC, useState } from "react"
import { useTranslation } from "react-i18next"
import { useInterval, useMedia } from "react-use"

import type { AModeFeatureCard } from "./useAModeFeatureCards"

const ADVANCE_MS = 6000

export const AModeFeatureCarousel: FC<{ cards: AModeFeatureCard[]; className?: string }> = ({
  cards,
  className,
}) => {
  const { t } = useTranslation()
  const reducedMotion = useMedia("(prefers-reduced-motion: reduce)", false)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const autoAdvance = cards.length > 1 && !paused && !reducedMotion
  useInterval(() => setIndex((prev) => (prev + 1) % cards.length), autoAdvance ? ADVANCE_MS : null)

  const current = cards[index % Math.max(cards.length, 1)]
  if (!current) return null
  const { shortcut, copy } = current
  const Icon = shortcut.icon

  return (
    <section
      aria-roledescription={t("carousel")}
      aria-label={t("Wallet features")}
      data-testid="a-mode-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false)
      }}
      className={cn(
        "flex items-center gap-6 rounded-sm bg-gradient-to-br from-primary/15 to-grey-900 px-6 py-4",
        className
      )}
    >
      <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Icon className="size-10" aria-hidden />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p
          className="text-body text-sm leading-[1.3]"
          aria-live={autoAdvance ? "off" : "polite"}
          data-testid="a-mode-carousel-card"
          data-card={shortcut.id}
        >
          {copy}
        </p>
        {cards.length > 1 && (
          <div className="-ml-1 flex items-center">
            {cards.map((card, i) => (
              <button
                key={card.shortcut.id}
                type="button"
                aria-label={t("Show {{feature}}", { feature: card.shortcut.label })}
                aria-current={i === index || undefined}
                onClick={() => setIndex(i)}
                className="flex h-8 items-center px-1 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span
                  className={cn(
                    "block h-2 rounded-full transition-[width]",
                    i === index ? "w-8 bg-primary" : "w-2 bg-grey-600"
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        data-testid="a-mode-carousel-action"
        aria-disabled={shortcut.disabled || undefined}
        title={shortcut.disabled ? shortcut.disabledReason : undefined}
        onClick={shortcut.disabled ? undefined : shortcut.onClick}
        className={cn(
          "h-14 shrink-0 rounded-full bg-primary px-6 font-bold text-body-black text-xs",
          "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
          shortcut.disabled ? "cursor-not-allowed opacity-50" : "hover:bg-primary-700"
        )}
      >
        {shortcut.label}
      </button>
    </section>
  )
}
