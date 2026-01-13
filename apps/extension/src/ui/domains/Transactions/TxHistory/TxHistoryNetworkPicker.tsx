import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import type { Network } from "@talismn/chaindata-provider"
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GlobeIcon,
  XIcon,
} from "@talismn/icons"
import { classNames } from "@talismn/util"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkType } from "@ui/domains/Networks/NetworkType"
import { IS_POPUP } from "@ui/util/constants"
import { type FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, Modal } from "talisman-ui"

export const TxHistoryNetworkPicker: FC<{
  isOpen?: boolean
  networks: Network[]
  selectedNetworkId: string | null
  onDismiss: () => void
  onSelect: (networkId: string | null) => void
}> = ({ isOpen, selectedNetworkId, networks: allNetworks, onDismiss, onSelect }) => {
  const { t } = useTranslation()

  const [search, setSearch] = useState("")

  const networks = useMemo(
    () => allNetworks.filter((network) => !search || network.name?.toLowerCase().includes(search)),
    [allNetworks, search]
  )

  return (
    <Modal
      containerId="main"
      isOpen={isOpen}
      onDismiss={onDismiss}
      className={classNames("relative z-50", IS_POPUP ? "size-full" : "h-[60rem] w-[40rem]")}
    >
      <div className="flex size-full flex-grow flex-col bg-black">
        <header className="flex items-center justify-between p-10">
          <IconButton onClick={onDismiss} className={IS_POPUP ? "visible" : "invisible"}>
            <ChevronLeftIcon />
          </IconButton>
          <div>{t("Select network")}</div>
          <IconButton onClick={onDismiss} className={IS_POPUP ? "invisible" : "visible"}>
            <XIcon />
          </IconButton>
        </header>
        <div className="flex grow flex-col overflow-hidden">
          <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
            <SearchInput onChange={setSearch} placeholder={t("Search by name")} />
          </div>
          <ScrollContainer className="scrollable grow border-grey-700 border-t bg-black-secondary">
            <NetworksList
              networks={networks}
              selectedNetworkId={selectedNetworkId}
              showAllNetworksBtn={!search && !!networks.length}
              onSelect={onSelect}
            />
          </ScrollContainer>
        </div>
      </div>
    </Modal>
  )
}

const NetworksList: FC<{
  networks: Network[]
  selectedNetworkId: string | null
  showAllNetworksBtn?: boolean
  onSelect: (networkId: string | null) => void
}> = ({ networks, selectedNetworkId, showAllNetworksBtn, onSelect }) => {
  const { t } = useTranslation()

  return (
    <div>
      {showAllNetworksBtn && (
        <NetworkRow network={null} onClick={() => onSelect(null)} selected={!selectedNetworkId} />
      )}
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
    </div>
  )
}

const NetworkRow: FC<{
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
      <div className="shrinkk-0 flex size-12 items-center justify-center">
        {selected ? (
          <CheckCircleIcon className="text-body" />
        ) : (
          <ChevronRightIcon className="text-md" />
        )}
      </div>
    </button>
  )
}
