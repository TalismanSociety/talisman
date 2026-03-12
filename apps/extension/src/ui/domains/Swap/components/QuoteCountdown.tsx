import { type FC, useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

const CIRCLE_RADIUS = 8
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS
const DEFAULT_REFETCH_INTERVAL_MS = 20_000
const TICK_MS = 1_000

type QuoteCountdownProps = {
  refetchIntervalMs?: number
  isLoading?: boolean
}

export const QuoteCountdown: FC<QuoteCountdownProps> = ({
  refetchIntervalMs = DEFAULT_REFETCH_INTERVAL_MS,
  isLoading,
}) => {
  const { t } = useTranslation()
  const [remainingMs, setRemainingMs] = useState(refetchIntervalMs)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Reset countdown whenever loading finishes (quotes were refreshed)
  useEffect(() => {
    if (isLoading) {
      clearTimer()
      return
    }

    setRemainingMs(refetchIntervalMs)

    intervalRef.current = setInterval(() => {
      setRemainingMs((prev) => {
        const next = prev - TICK_MS
        return next <= 0 ? refetchIntervalMs : next
      })
    }, TICK_MS)

    return clearTimer
  }, [isLoading, refetchIntervalMs, clearTimer])

  if (isLoading) {
    return (
      <output
        className="flex h-[20px] w-[20px] shrink-0 items-center justify-center"
        aria-label={t("Loading new quotes")}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" className="animate-spin">
          <circle
            cx="10"
            cy="10"
            r={CIRCLE_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${CIRCLE_CIRCUMFERENCE * 0.25} ${CIRCLE_CIRCUMFERENCE * 0.75}`}
            className="text-body-secondary"
          />
        </svg>
      </output>
    )
  }

  const remainingSec = Math.ceil(remainingMs / 1_000)
  const progress = remainingMs / refetchIntervalMs

  return (
    <div
      role="timer"
      className="relative flex h-[20px] w-[20px] shrink-0 items-center justify-center"
      title={t("Quote refreshes in {{seconds}}s", { seconds: remainingSec })}
      aria-label={t("Quote refreshes in {{seconds}}s", { seconds: remainingSec })}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90">
        <circle
          cx="10"
          cy="10"
          r={CIRCLE_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-white/10"
        />
        <circle
          cx="10"
          cy="10"
          r={CIRCLE_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={CIRCLE_CIRCUMFERENCE}
          strokeDashoffset={CIRCLE_CIRCUMFERENCE * (1 - progress)}
          strokeLinecap="round"
          className="text-body-secondary transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <span className="absolute text-[8px] text-body-secondary leading-none">{remainingSec}</span>
    </div>
  )
}
