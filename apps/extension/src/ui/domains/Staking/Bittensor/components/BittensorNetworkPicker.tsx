import type { DotNetworkId } from "@talismn/chaindata-provider"
import { Modal } from "@ui/components/Modal"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { useNetworkById } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

const NetworkOption: FC<{
  networkId: DotNetworkId
  selected: boolean
  onClick: () => void
}> = ({ networkId, selected, onClick }) => {
  const network = useNetworkById(networkId, "polkadot")

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-6 rounded-sm border bg-grey-900 p-8 text-left hover:bg-grey-850",
        selected ? "border-grey-700" : "border-transparent"
      )}
    >
      <NetworkLogo networkId={networkId} className="size-12 shrink-0" />
      <span className="grow truncate font-bold text-base text-body">
        {network?.name ?? networkId}
      </span>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-grey-750">
        {selected && <span className="size-4 rounded-full bg-primary" />}
      </span>
    </button>
  )
}

type BittensorNetworkPickerProps = {
  isOpen: boolean
  containerId: string
  networkIds: DotNetworkId[]
  value: DotNetworkId
  onSelect: (networkId: DotNetworkId) => void
  onDismiss: () => void
}

export const BittensorNetworkPicker: FC<BittensorNetworkPickerProps> = ({
  isOpen,
  containerId,
  networkIds,
  value,
  onSelect,
  onDismiss,
}) => {
  const { t } = useTranslation()

  return (
    <Modal containerId={containerId} isOpen={isOpen} onDismiss={onDismiss}>
      <WizardModalDialog
        title={t("Select Network")}
        onBackClick={onDismiss}
        contentClassName="flex flex-col gap-8"
      >
        {networkIds.map((networkId) => (
          <NetworkOption
            key={networkId}
            networkId={networkId}
            selected={networkId === value}
            onClick={() => {
              onSelect(networkId)
              onDismiss()
            }}
          />
        ))}
      </WizardModalDialog>
    </Modal>
  )
}
