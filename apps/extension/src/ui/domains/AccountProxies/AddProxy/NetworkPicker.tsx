import type { DotNetwork } from "@talismn/chaindata-provider"
import { CheckmarkIcon } from "@talismn/icons"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { cn } from "@ui/util/cn"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { SearchablePickerLayout } from "./SearchablePickerLayout"

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
  networks: allNetworks,
  selectedNetworkId,
  onSelect,
  onDismiss,
}) => {
  const { t } = useTranslation()

  return (
    <SearchablePickerLayout
      isOpen={isOpen}
      containerId={containerId}
      title={t("Select Network")}
      searchPlaceholder={t("Search by name")}
      onDismiss={onDismiss}
    >
      {(search) => (
        <NetworkList
          networks={allNetworks}
          search={search}
          selectedNetworkId={selectedNetworkId}
          onSelect={onSelect}
        />
      )}
    </SearchablePickerLayout>
  )
}

const NetworkList: FC<{
  networks: DotNetwork[]
  search: string
  selectedNetworkId: string
  onSelect: (networkId: string) => void
}> = ({ networks: allNetworks, search, selectedNetworkId, onSelect }) => {
  const { t } = useTranslation()

  const networks = useMemo(
    () =>
      allNetworks.filter(
        (network) => !search || network.name?.toLowerCase().includes(search.toLowerCase())
      ),
    [allNetworks, search]
  )

  return (
    <>
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
    </>
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
