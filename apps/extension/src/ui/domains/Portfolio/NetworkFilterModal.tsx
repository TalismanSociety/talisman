import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useCallback, useDeferredValue, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, Modal } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { NetworkOption } from "@ui/atoms"
import { IS_POPUP } from "@ui/util/constants"

import { ChainLogo } from "../Asset/ChainLogo"
import { usePortfolio } from "./usePortfolio"

const NetworkRow: FC<{ id: string; name: string; isSelected?: boolean; onClick: () => void }> = ({
  id,
  name,
  isSelected,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "text-body-secondary hover:text-body hover:bg-grey-800 flex h-24 w-full items-center gap-6 overflow-hidden px-12",
        "focus-visible:bg-grey-800",
        isSelected && "!bg-grey-700"
      )}
    >
      <ChainLogo id={id} className="shrink-0 text-xl" />
      <div className="text-body flex grow flex-col gap-2 truncate text-left">{name}</div>
    </button>
  )
}

const NetworksList: FC<{
  networks: NetworkOption[]
  networkId: string | null
  onChange: (id: string | null) => void
}> = ({ networks, networkId, onChange }) => {
  const { t } = useTranslation()
  const handleChange = useCallback(
    (id: string) => () => {
      onChange(id === "ALL_NETWORKS" ? null : id)
    },
    [onChange]
  )

  return (
    <div className="flex flex-col">
      <NetworkRow
        id={"ALL_NETWORKS"}
        name={t("All Networks")}
        onClick={handleChange("ALL_NETWORKS")}
      />
      {networks.map((network) => (
        <NetworkRow
          key={network.id}
          id={network.id}
          name={network.name}
          isSelected={network.id === networkId}
          onClick={handleChange(network.id)}
        />
      ))}
    </div>
  )
}

const NetworkFilterModalContent: FC<{
  networkIds: string[]
  networkId: string | null
  onChange: (networkId: string | null) => void
  onClose?: () => void
}> = ({ networkIds, networkId, onChange, onClose }) => {
  const { t } = useTranslation()
  // network options may include pairs of evm+chain networks
  const { networks } = usePortfolio()

  const [rawSearch, setSearch] = useState<string>("")
  const search = useDeferredValue(rawSearch)

  const filteredNetworks = useMemo(() => {
    const lowerSearch = search.toLowerCase()
    return networks.filter((network) => {
      const thisNetworkIds = [
        ...new Set([network.id, network.evmNetworkId, network.chainId].filter(Boolean) as string[]),
      ]
      return (
        thisNetworkIds.some((id) => networkIds.includes(id)) &&
        (network.name.toLowerCase().includes(lowerSearch) ||
          network.symbols?.find((symbol) => symbol.toLowerCase().includes(lowerSearch)))
      )
    })
  }, [networkIds, networks, search])

  return (
    <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
      <div className="flex w-full items-center px-8 pt-8">
        <IconButton
          className={classNames("size-12 shrink-0", !IS_POPUP && "invisible")}
          onClick={onClose}
        >
          <ChevronLeftIcon />
        </IconButton>
        <div className="text-secondary grow text-center">{t("Network Filter")}</div>
        <IconButton
          className={classNames("size-12 shrink-0", IS_POPUP && "invisible")}
          onClick={onClose}
        >
          <XIcon />
        </IconButton>
      </div>
      <div className="flex w-full shrink-0 items-center gap-8 px-12 py-8">
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <SearchInput onChange={setSearch} placeholder={t("Search by network name")} autoFocus />
      </div>
      <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
        <NetworksList networks={filteredNetworks} networkId={networkId} onChange={onChange} />
      </ScrollContainer>
    </div>
  )
}

export const NetworkFilterModal: FC<{
  isOpen?: boolean
  networkIds: string[]
  networkId: string | null
  onChange: (networkId: string | null) => void
  onClose: () => void
}> = ({ isOpen, networkIds, networkId, onChange, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onDismiss={onClose}
      className={classNames(
        "border-grey-800 h-[60rem] w-[40rem] overflow-hidden bg-black",
        IS_POPUP ? "max-h-full max-w-full" : "rounded-lg border shadow"
      )}
      containerId={IS_POPUP ? "main" : undefined}
    >
      <NetworkFilterModalContent
        networkIds={networkIds}
        networkId={networkId}
        onChange={onChange}
        onClose={onClose}
      />
    </Modal>
  )
}
