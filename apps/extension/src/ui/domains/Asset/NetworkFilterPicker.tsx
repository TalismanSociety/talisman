import type { Network } from "@talismn/chaindata-provider"
import { CheckmarkIcon, GlobeIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { Modal } from "@ui/components/Modal"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { SearchInput } from "@ui/components/SearchInput"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkType } from "@ui/domains/Networks/NetworkType"
import { useOpenCloseStatus } from "@ui/hooks/useOpenCloseStatus"
import { type FC, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

type NetworkFilterPickerProps = {
  isOpen: boolean
  containerId: string
  networks: Network[]
  selectedNetworkId: string | null
  onSelect: (networkId: string | null) => void
  onDismiss: () => void
}

export const NetworkFilterPicker: FC<NetworkFilterPickerProps> = ({
  isOpen,
  containerId,
  networks,
  selectedNetworkId,
  onSelect,
  onDismiss,
}) => {
  return (
    <Modal containerId={containerId} isOpen={isOpen} onDismiss={onDismiss}>
      <NetworkFilterPickerContent
        networks={networks}
        selectedNetworkId={selectedNetworkId}
        onSelect={onSelect}
        onDismiss={onDismiss}
      />
    </Modal>
  )
}

const NetworkFilterPickerContent: FC<{
  networks: Network[]
  selectedNetworkId: string | null
  onSelect: (networkId: string | null) => void
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
      contentClassName="!p-0"
      title={t("Network Filter")}
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
          <NetworkFilterList
            networks={networks}
            selectedNetworkId={selectedNetworkId}
            showAllNetworksRow={!search && !!allNetworks.length}
            onSelect={onSelect}
          />
        </ScrollContainer>
      </div>
    </WizardModalDialog>
  )
}

const NetworkFilterList: FC<{
  networks: Network[]
  selectedNetworkId: string | null
  showAllNetworksRow?: boolean
  onSelect: (networkId: string | null) => void
}> = ({ networks, selectedNetworkId, showAllNetworksRow, onSelect }) => {
  const { t } = useTranslation()

  return (
    <div>
      {showAllNetworksRow && (
        <NetworkFilterRow
          network={null}
          selected={!selectedNetworkId}
          onClick={() => onSelect(null)}
        />
      )}
      {networks.map((network) => (
        <NetworkFilterRow
          key={network.id}
          network={network}
          selected={network.id === selectedNetworkId}
          onClick={() => onSelect(network.id)}
        />
      ))}
      {networks.length === 0 && (
        <div className="p-16 text-center text-body-secondary">{t("No networks found")}</div>
      )}
    </div>
  )
}

const NetworkFilterRow: FC<{
  network: Network | null
  selected?: boolean
  onClick: () => void
}> = ({ network, selected, onClick }) => {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "flex h-28 w-full items-center gap-6 overflow-hidden px-12 text-body-secondary hover:bg-grey-800 hover:text-body",
        "focus-visible:bg-grey-800",
        selected && "!bg-grey-700"
      )}
    >
      {network ? (
        <NetworkLogo networkId={network.id} className="shrink-0 text-xl" />
      ) : (
        <GlobeIcon className="shrink-0 text-xl" />
      )}
      <div className="flex grow flex-col gap-1 truncate text-left text-body">
        <div>{network ? network.name : t("All Networks")}</div>
        {!!network && (
          <div className="text-body-inactive text-xs">
            <NetworkType networkId={network.id} />
          </div>
        )}
      </div>

      {selected && (
        <div className="flex size-12 shrink-0 items-center justify-center">
          <CheckmarkIcon className="size-10" />
        </div>
      )}
    </button>
  )
}
