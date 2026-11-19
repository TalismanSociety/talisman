import { DollarSignIcon, EyeOffIcon, FilterIcon } from "@talismn/icons"
import { useToggleCurrency } from "@ui/hooks/useToggleCurrency"
import { useSelectedCurrency, useSetting } from "@ui/state/settings"
import { cn } from "@ui/util/cn"
import type { FC, ReactNode, SVGProps } from "react"
import { useTranslation } from "react-i18next"

const CHIP_CLASSNAME = cn(
  "flex h-14 shrink-0 items-center gap-2 rounded-full border px-5 text-xs",
  "focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
)

const ToggleChip: FC<{
  testId: string
  icon: FC<SVGProps<SVGSVGElement>>
  pressed: boolean
  onToggle: () => void
  children: ReactNode
}> = ({ testId, icon: Icon, pressed, onToggle, children }) => (
  <button
    type="button"
    data-testid={testId}
    aria-pressed={pressed}
    onClick={onToggle}
    className={cn(
      CHIP_CLASSNAME,
      pressed
        ? "border-primary/50 bg-primary/10 text-primary"
        : "border-grey-750 text-body-secondary hover:bg-white/5 hover:text-body"
    )}
  >
    <Icon className="size-8" aria-hidden />
    <span>{children}</span>
  </button>
)

export const AModeQuickToggles: FC<{ className?: string }> = ({ className }) => {
  const { t } = useTranslation()
  const [hideBalances, setHideBalances] = useSetting("hideBalances")
  const [hideDust, setHideDust] = useSetting("hideDust")
  const currency = useSelectedCurrency()
  const toggleCurrency = useToggleCurrency()

  return (
    <fieldset
      data-testid="a-mode-quick-toggles"
      className={cn("flex flex-wrap items-center gap-3", className)}
    >
      <legend className="sr-only">{t("Quick toggles")}</legend>
      <ToggleChip
        testId="a-mode-toggle-hide-balances"
        icon={EyeOffIcon}
        pressed={hideBalances}
        onToggle={() => setHideBalances((prev) => !prev)}
      >
        {t("Hide balances")}
      </ToggleChip>
      <ToggleChip
        testId="a-mode-toggle-hide-dust"
        icon={FilterIcon}
        pressed={hideDust}
        onToggle={() => setHideDust((prev) => !prev)}
      >
        {t("Hide small balances")}
      </ToggleChip>
      <button
        type="button"
        data-testid="a-mode-toggle-currency"
        onClick={toggleCurrency}
        aria-label={t("Switch currency, current {{currency}}", {
          currency: currency.toUpperCase(),
        })}
        className={cn(
          CHIP_CLASSNAME,
          "border-grey-750 text-body-secondary hover:bg-white/5 hover:text-body"
        )}
      >
        <DollarSignIcon className="size-8" aria-hidden />
        <span className="font-bold text-body">{currency.toUpperCase()}</span>
      </button>
    </fieldset>
  )
}
