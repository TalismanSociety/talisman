import { Modal } from "@ui/components/Modal"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

export type ConvictionLockType = "decaying" | "perpetual"

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

  const options: { value: ConvictionLockType; title: string; description: string }[] = [
    {
      value: "decaying",
      title: t("Decaying Lock"),
      description: t(
        "Recommended. Your {{symbol}} stays locked but the lock unwinds on its own — roughly 50% releases every 90 days, tapering off as it approaches zero. As it unwinds your {{symbol}} becomes progressively available to unstake or transfer, and the conviction it carries declines. Choose this if you want to signal commitment now but expect to free up your stake over time.",
        { symbol }
      ),
    },
    {
      value: "perpetual",
      title: t("Perpetual Lock"),
      description: t(
        "Your {{symbol}} stays locked at the full amount — the lock does not decay while perpetual, building and holding the maximum conviction on the subnet. It cannot be unstaked or transferred for as long as this is enabled. You can switch back to a decaying lock later, which resumes the gradual unlock.",
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
        <p className="shrink-0 text-body-secondary text-sm leading-paragraph">
          {t(
            "Locking your stake builds conviction — a public, on-chain commitment signal — on the subnet. A lock can be topped up but not reduced; you can switch its type at any time."
          )}
        </p>
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
                  "flex w-full flex-col gap-4 rounded-sm border p-8 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-grey-700 bg-grey-900 hover:bg-grey-800"
                )}
              >
                <div className="flex items-center gap-6">
                  <span
                    className={cn(
                      "flex size-16 shrink-0 items-center justify-center rounded-full border-2",
                      selected ? "border-primary" : "border-grey-600"
                    )}
                  >
                    {selected && <span className="size-8 rounded-full bg-primary" />}
                  </span>
                  <span className="font-bold text-base text-body">{option.title}</span>
                </div>
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
