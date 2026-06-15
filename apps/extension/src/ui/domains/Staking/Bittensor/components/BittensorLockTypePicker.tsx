import { Modal } from "@ui/components/Modal"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { cn } from "@ui/util/cn"
import { type FC, useId } from "react"
import { useTranslation } from "react-i18next"

export type ConvictionLockType = "decaying" | "perpetual"

// A decaying conviction lock sheds its mass exponentially. On chain the decay constant
// (UnlockRate, governance-tunable) is ~934,866 blocks — that is the e-folding time τ (~130 days at
// 12s/block), NOT the half-life; the half-life is τ·ln2 ≈ 648k blocks ≈ 90 days. We model the
// locked share as mass(t) = 0.5 ^ (t / 90 days), the same 90-day figure the copy below quotes.
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

const LockTypeOption: FC<{
  value: ConvictionLockType
  name: string
  title: string
  description: string
  selected: boolean
  onClick: () => void
}> = ({ value, name, title, description, selected, onClick }) => (
  <label
    className={cn(
      "flex w-full cursor-pointer flex-col gap-10 rounded-sm border bg-grey-900 p-8 text-left focus-within:border-grey-700 hover:bg-grey-850",
      selected ? "border-grey-700" : "border-transparent"
    )}
  >
    {/* native radio (visually hidden): group/arrow-key semantics for free; readOnly only mutes
        the controlled-input warning — selection is handled by onClick so re-picking the already
        selected option still dismisses the modal */}
    <input
      type="radio"
      name={name}
      value={value}
      checked={selected}
      onClick={onClick}
      readOnly
      className="sr-only"
    />
    <div className="flex items-start justify-between gap-4">
      <span className="font-bold text-base text-body">{title}</span>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-grey-750">
        {selected && <span className="size-4 rounded-full bg-primary" />}
      </span>
    </div>
    <LockTypeCurve variant={value} className={selected ? "text-primary" : "text-body-secondary"} />
    <span className="text-body-secondary text-sm leading-paragraph">{description}</span>
  </label>
)

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
  const radioName = useId()

  const options: {
    value: ConvictionLockType
    title: string
    description: string
  }[] = [
    {
      value: "decaying",
      title: t("Decaying Lock"),
      description: t(
        "Half of the remaining locked {{symbol}} unlocks every 90 days. More stake becomes available to unstake, move, or transfer as it decays.",
        { symbol }
      ),
    },
    {
      value: "perpetual",
      title: t("Perpetual Lock"),
      description: t(
        "Your {{symbol}} stays fully locked and keeps maximum conviction. It cannot be unstaked while locked. If transferred, the lock and conviction move to the recipient.",
        { symbol }
      ),
    },
  ]

  return (
    <Modal containerId={containerId} isOpen={isOpen} onDismiss={onDismiss}>
      <WizardModalDialog
        title={t("Lock Type")}
        onBackClick={onDismiss}
        contentClassName="overflow-hidden flex flex-col gap-6"
      >
        <ScrollContainer className="grow" innerClassName="flex w-full flex-col gap-8">
          {options.map((option) => (
            <LockTypeOption
              key={option.value}
              value={option.value}
              name={radioName}
              title={option.title}
              description={option.description}
              selected={option.value === value}
              onClick={() => {
                onSelect(option.value)
                onDismiss()
              }}
            />
          ))}
        </ScrollContainer>
      </WizardModalDialog>
    </Modal>
  )
}
