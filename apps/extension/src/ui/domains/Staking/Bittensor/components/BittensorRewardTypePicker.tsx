import { Button } from "@ui/components/Button"
import { Modal } from "@ui/components/Modal"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import type { RootClaimType } from "@ui/domains/Staking/hooks/bittensor/dTao/types"
import { cn } from "@ui/util/cn"
import { type FC, useEffect, useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { BittensorSubnetMultiSelect } from "./BittensorSubnetMultiSelect"

const RewardTypeOption: FC<{
  value: RootClaimType
  name: string
  title: string
  description: string
  selected: boolean
  onClick: () => void
}> = ({ value, name, title, description, selected, onClick }) => (
  <label
    className={cn(
      "flex w-full cursor-pointer flex-col gap-4 rounded-sm border bg-grey-900 p-8 text-left focus-within:border-grey-700 hover:bg-grey-850",
      selected ? "border-grey-700" : "border-transparent"
    )}
  >
    {/* native radio (visually hidden): group/arrow-key semantics for free; readOnly only mutes the
        controlled-input warning — selection is handled by onClick so re-picking the already
        selected option still advances the flow */}
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
    <span className="text-body-secondary text-sm leading-paragraph">{description}</span>
  </label>
)

type RewardTypePickerView = "type" | "subnets"

type BittensorRewardTypePickerProps = {
  isOpen: boolean
  containerId: string
  value: RootClaimType | null
  networkId: string
  selectedSubnets: number[]
  /** which view to open on: "subnets" jumps straight to subnet selection (KeepSubnets only) */
  initialView?: RewardTypePickerView
  onSelect: (value: RootClaimType) => void
  onToggleSubnet: (netuid: number) => void
  onDismiss: () => void
}

export const BittensorRewardTypePicker: FC<BittensorRewardTypePickerProps> = ({
  isOpen,
  containerId,
  value,
  networkId,
  selectedSubnets,
  initialView = "type",
  onSelect,
  onToggleSubnet,
  onDismiss,
}) => {
  const { t } = useTranslation()
  const radioName = useId()
  const [view, setView] = useState<RewardTypePickerView>(initialView)

  // reset to the requested view each time the picker opens
  useEffect(() => {
    if (isOpen) setView(initialView)
  }, [isOpen, initialView])

  const options: { value: RootClaimType; title: string; description: string }[] = [
    {
      value: "Swap",
      title: t("Receive rewards in Tao"),
      description: t("Rewards are converted to Tao and automatically re-staked. (Default)"),
    },
    {
      value: "Keep",
      title: t("Receive rewards in Alpha"),
      description: t("Rewards are kept in subnet alpha tokens, across all subnets."),
    },
    {
      value: "KeepSubnets",
      title: t("Receive rewards in Selected Alpha"),
      description: t(
        "Rewards are kept in alpha tokens for the subnets you specify, the remainder is converted to Tao."
      ),
    },
  ]

  return (
    <Modal containerId={containerId} isOpen={isOpen} onDismiss={onDismiss}>
      {view === "subnets" ? (
        <WizardModalDialog
          title={t("Select Subnets")}
          onBackClick={() => setView("type")}
          contentClassName="p-0! overflow-hidden flex flex-col"
        >
          <div className="flex size-full flex-col gap-6 overflow-hidden pt-6">
            <BittensorSubnetMultiSelect
              networkId={networkId}
              selectedSubnets={selectedSubnets}
              onToggle={onToggleSubnet}
            />
            <div className="px-12 pb-12">
              <Button
                className="w-full"
                primary
                disabled={selectedSubnets.length === 0}
                onClick={onDismiss}
              >
                {t("Done")}
              </Button>
            </div>
          </div>
        </WizardModalDialog>
      ) : (
        <WizardModalDialog
          title={t("Reward Type")}
          onBackClick={onDismiss}
          contentClassName="overflow-hidden flex flex-col gap-6"
        >
          <ScrollContainer className="grow" innerClassName="flex w-full flex-col gap-8">
            {options.map((option) => (
              <RewardTypeOption
                key={option.value}
                value={option.value}
                name={radioName}
                title={option.title}
                description={option.description}
                selected={option.value === value}
                onClick={() => {
                  onSelect(option.value)
                  // KeepSubnets continues into subnet selection; the others commit and close
                  if (option.value === "KeepSubnets") setView("subnets")
                  else onDismiss()
                }}
              />
            ))}
          </ScrollContainer>
        </WizardModalDialog>
      )}
    </Modal>
  )
}

/** The user-facing label for a reward type, for the picker trigger button. */
export const useRewardTypeLabel = (value: RootClaimType | null): string => {
  const { t } = useTranslation()
  switch (value) {
    case "Swap":
      return t("Tao")
    case "Keep":
      return t("Alpha")
    case "KeepSubnets":
      return t("Selected Alpha")
    default:
      return t("Select")
  }
}
