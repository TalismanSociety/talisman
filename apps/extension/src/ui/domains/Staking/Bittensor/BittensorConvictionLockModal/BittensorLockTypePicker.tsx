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
        "Recommended. Your {{symbol}} stays locked but unwinds on its own, releasing back to you little by little over time until it is fully unlocked — at which point it can be unstaked or transferred again. While locked it earns governance conviction (voting weight) that builds the longer it stays and fades as the lock decays. Choose this if you want a say in the subnet now but expect to free up your stake later.",
        { symbol }
      ),
    },
    {
      value: "perpetual",
      title: t("Perpetual Lock"),
      description: t(
        "Your {{symbol}} stays locked indefinitely — it never unwinds and can never be unstaked or transferred again. In return it holds the maximum governance conviction (voting weight) for as long as it remains locked, giving you the strongest, most durable say in the subnet. Only choose this if you are committing this stake to the subnet for good.",
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
            "Locking your stake grants it governance voting weight (conviction) on the subnet. Choose how long you want to commit it — this can't be reduced later, only topped up."
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
