import { Modal } from "@ui/components/Modal"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { cn } from "@ui/util/cn"
import { type FC, useId } from "react"
import { useTranslation } from "react-i18next"

export type ConvictionLockType = "decaying" | "perpetual"

// A decaying conviction lock sheds its mass exponentially. On chain the unlock rate (UnlockRate) is
// ~934,866 blocks — a ~90-day half-life at 12s/block — so we model the locked share as
// mass(t) = 0.5 ^ (t / 90 days). This keeps the curve faithful to real decay durations (the rate is
// governance-tunable, but 90 days is the current value, and the copy below quotes the same figure).
const HALF_LIFE_DAYS = 90
const HORIZON_DAYS = 365

const buildLockCurvePaths = (variant: ConvictionLockType) => {
  const toX = (days: number) => (days / HORIZON_DAYS) * 100
  // 100% locked sits near the top (y=4), fully unlocked near the bottom (y=96)
  const toY = (mass: number) => 4 + (1 - mass) * 92
  const massAt = (days: number) => (variant === "perpetual" ? 1 : 2 ** (-days / HALF_LIFE_DAYS))

  const steps = 48
  const line = Array.from({ length: steps + 1 }, (_, i) => {
    const days = (i / steps) * HORIZON_DAYS
    return `${i === 0 ? "M" : "L"}${toX(days).toFixed(2)} ${toY(massAt(days)).toFixed(2)}`
  }).join(" ")

  // close the area down to the baseline so it can be filled with a fading gradient
  return { line, area: `${line} L100 100 L0 100 Z` }
}

/**
 * Illustrates how the locked amount evolves over a year: a realistic exponential decay (~90-day
 * half-life) for a decaying lock, or a flat line held at the full amount for a perpetual lock.
 */
const LockTypeCurve: FC<{ variant: ConvictionLockType; className?: string }> = ({
  variant,
  className,
}) => {
  const { t } = useTranslation()
  const gradientId = useId()
  const { line, area } = buildLockCurvePaths(variant)

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="h-32 w-full">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex justify-between text-body-disabled text-tiny">
        <span>{t("Now")}</span>
        <span>{t("3mo")}</span>
        <span>{t("6mo")}</span>
        <span>{t("9mo")}</span>
        <span>{t("1yr")}</span>
      </div>
    </div>
  )
}

type BittensorLockTypePickerProps = {
  isOpen: boolean
  containerId: string
  value: ConvictionLockType
  symbol: string
  onSelect: (value: ConvictionLockType) => void
  onDismiss: () => void
}

export const BittensorLockTypePicker: FC<BittensorLockTypePickerProps> = ({
  isOpen,
  containerId,
  value,
  symbol,
  onSelect,
  onDismiss,
}) => {
  const { t } = useTranslation()

  const options: {
    value: ConvictionLockType
    title: string
    description: string
  }[] = [
    {
      value: "decaying",
      title: t("Decaying Lock"),
      description: t(
        "Recommended. Your locked {{symbol}} releases on its own — roughly 50% every 90 days, tapering toward zero over about a year. Your stake, and the conviction it carries, free up gradually.",
        { symbol }
      ),
    },
    {
      value: "perpetual",
      title: t("Perpetual Lock"),
      description: t(
        "Your {{symbol}} stays locked at the full amount, holding maximum conviction. It can't be unstaked while perpetual, and transferring it hands the lock to the recipient. Switch back to a decaying lock at any time to resume the unlock.",
        { symbol }
      ),
    },
  ]

  return (
    <Modal containerId={containerId} isOpen={isOpen} onDismiss={onDismiss}>
      <WizardModalDialog
        title={t("Lock type")}
        onBackClick={onDismiss}
        contentClassName="overflow-hidden flex flex-col gap-6"
      >
        <ScrollContainer className="grow" innerClassName="flex w-full flex-col gap-8">
          {options.map((option) => {
            const selected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onSelect(option.value)
                  onDismiss()
                }}
                className={cn(
                  "flex w-full flex-col gap-6 rounded-sm border p-8 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-grey-700 bg-grey-900 hover:bg-grey-800"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="font-bold text-base text-body">{option.title}</span>
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full border-2",
                      selected ? "border-primary" : "border-grey-600"
                    )}
                  >
                    {selected && <span className="size-4 rounded-full bg-primary" />}
                  </span>
                </div>
                <LockTypeCurve
                  variant={option.value}
                  className={selected ? "text-primary" : "text-body-secondary"}
                />
                <span className="text-body-secondary text-sm leading-paragraph">
                  {option.description}
                </span>
              </button>
            )
          })}
        </ScrollContainer>
      </WizardModalDialog>
    </Modal>
  )
}
