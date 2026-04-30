import type { DotNetwork } from "@talismn/chaindata-provider"
import { CheckmarkIcon } from "@talismn/icons"
import { Modal } from "@ui/components/Modal"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { SearchInput } from "@ui/components/SearchInput"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { useOpenCloseStatus } from "@ui/hooks/useOpenCloseStatus"
import { cn } from "@ui/util/cn"
import { type FC, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

type NetworkPickerProps = {
  isOpen: boolean
  containerId: string
  networks: DotNetwork[]
  selectedNetworkId: string
  onSelect: (networkId: string) => void
  onDismiss: () => void
}

export const NetworkPicker: FC<NetworkPickerProps> = ({
  isOpen,
  containerId,
  networks,
  selectedNetworkId,
  onSelect,
  onDismiss,
}) => {
  return (
    <Modal containerId={containerId} isOpen={isOpen} onDismiss={onDismiss}>
      <NetworkPickerContent
        networks={networks}
        selectedNetworkId={selectedNetworkId}
        onSelect={onSelect}
        onDismiss={onDismiss}
      />
    </Modal>
  )
}

const NetworkPickerContent: FC<{
  networks: DotNetwork[]
  selectedNetworkId: string
  onSelect: (networkId: string) => void
  onDismiss: () => void
}> = ({ networks: allNetworks, selectedNetworkId, onSelect, onDismiss }) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

  const refSearchInput = useRef<HTMLInputElement>(null)
  const status = useOpenCloseStatus()
  useEffect(() => {
    if (status === "open") refSearchInput.current?.focus()
  }, [status])

  const networks = useMemo(
    () =>
      allNetworks.filter(
        (network) => !search || network.name?.toLowerCase().includes(search.toLowerCase())
      ),
    [allNetworks, search]
  )

  return (
    <WizardModalDialog
      className="border-none"
      contentClassName="p-0!"
      title={t("Select Network")}
      onBackClick={onDismiss}
    >
      <div className="flex size-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <SearchInput
            ref={refSearchInput}
            onChange={setSearch}
            placeholder={t("Search by name")}
          />
        </div>
        <ScrollContainer className="scrollable grow border-grey-700 border-t bg-black-secondary">
          {networks.map((network) => (
            <NetworkRow
              key={network.id}
              network={network}
              selected={network.id === selectedNetworkId}
              onClick={() => onSelect(network.id)}
            />
          ))}
          {networks.length === 0 && (
            <div className="p-16 text-center text-body-secondary">{t("No networks found")}</div>
          )}
        </ScrollContainer>
      </div>
    </WizardModalDialog>
  )
}

const NetworkRow: FC<{
  network: DotNetwork
  selected?: boolean
  onClick: () => void
}> = ({ network, selected, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-28 w-full items-center gap-6 overflow-hidden px-12 text-body-secondary hover:bg-grey-800 hover:text-body",
        "focus-visible:bg-grey-800",
        selected && "bg-grey-700!"
      )}
    >
      <NetworkLogo networkId={network.id} className="shrink-0 text-xl" />
      <div className="grow truncate text-left text-body">{network.name}</div>
      {selected && (
        <div className="flex size-12 shrink-0 items-center justify-center">
          <CheckmarkIcon className="size-10" />
        </div>
      )}
    </button>
  )
}
