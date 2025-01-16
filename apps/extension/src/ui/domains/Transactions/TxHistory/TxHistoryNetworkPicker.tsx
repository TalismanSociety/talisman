import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GlobeIcon,
  XIcon,
} from "@talismn/icons"
import { classNames } from "@talismn/util"
import { Chain, EvmNetwork } from "extension-core"
import { FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, Modal } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { useNetworkInfo } from "@ui/hooks/useNetworkInfo"
import { useChain, useChainByGenesisHash, useEvmNetwork } from "@ui/state"
import { IS_POPUP } from "@ui/util/constants"

type Network = Chain | EvmNetwork

const getNetworkId = (network: Network): string => {
  return "genesisHash" in network && network.genesisHash ? network.genesisHash : network.id
}

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
    [allNetworks, search],
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
          <ScrollContainer className="bg-black-secondary border-grey-700 scrollable grow border-t">
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
          selected={getNetworkId(network) === selectedNetworkId}
          onClick={() => onSelect(getNetworkId(network))}
        />
      ))}
      {networks.length === 0 && (
        <div className="text-body-secondary p-16 text-center">{t("No networks found")}</div>
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

  const chain = useChainByGenesisHash(
    network && "genesisHash" in network ? network.genesisHash : null,
  )
  const relay = useChain(chain?.relay?.id ?? null)
  const evmNetwork = useEvmNetwork(network?.id ?? null)
  const networkInfo = useNetworkInfo({ evmNetwork, chain, relay })

  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "text-body-secondary hover:text-body hover:bg-grey-800 flex h-24 w-full items-center gap-6 overflow-hidden px-12",
        "focus-visible:bg-grey-800",
        selected && "!bg-grey-700",
      )}
    >
      {network ? (
        <ChainLogo id={network.id} className="shrink-0 text-xl" />
      ) : (
        <GlobeIcon className="shrink-0 text-xl" />
      )}
      <div className="text-body flex grow flex-col truncate text-left">
        <div>{network ? network.name : t("All Networks")}</div>
        {networkInfo.type && <div className="text-body-disabled text-xs">{networkInfo.type}</div>}
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
