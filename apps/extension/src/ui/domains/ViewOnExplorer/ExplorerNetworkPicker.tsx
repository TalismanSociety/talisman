import { Network } from "@talismn/chaindata-provider"
import { ExternalLinkIcon, XIcon } from "@talismn/icons"
import { isAccountCompatibleWithNetwork, isAddressCompatibleWithNetwork } from "extension-core"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { IconButton } from "talisman-ui"
import urlJoin from "url-join"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { useBalancesFiatTotalPerNetwork } from "@ui/hooks/useBalancesFiatTotalPerNetwork"
import { useAccountByAddress, useBalancesByAddress, useNetworks } from "@ui/state"

import { ChainLogo } from "../Asset/ChainLogo"

const useExplorerNetworks = (address: string, search: string): Network[] => {
  const account = useAccountByAddress(address)
  const networks = useNetworks({ activeOnly: true, includeTestnets: true })

  const balances = useBalancesByAddress(address)
  const balancesPerNetwork = useBalancesFiatTotalPerNetwork(balances)

  const compatibleChains = useMemo<Network[]>(
    () =>
      networks.filter(
        (chain) =>
          !!chain.blockExplorerUrls.length &&
          !!chain.name &&
          // account is undefined for contacts
          (account
            ? isAccountCompatibleWithNetwork(chain, account)
            : isAddressCompatibleWithNetwork(chain, address)),
      ),

    [account, address, networks],
  )

  const sortedNetworks = useMemo(
    () =>
      compatibleChains.sort((a, b) => {
        if (balancesPerNetwork[a.id] || balancesPerNetwork[b.id])
          return (balancesPerNetwork[b.id] ?? 0) - (balancesPerNetwork[a.id] ?? 0)
        return (a.name ?? "").localeCompare(b.name ?? "")
      }),
    [balancesPerNetwork, compatibleChains],
  )

  return useMemo(() => {
    const lowerSearch = search.toLowerCase()
    return sortedNetworks.filter((network) => network.name?.toLowerCase().includes(lowerSearch))
  }, [search, sortedNetworks])
}

const NetworkRow: FC<{ network: Network; onClick: () => void }> = ({ network, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-body-secondary hover:text-body hover:bg-grey-800 flex h-32 w-full items-center gap-6 px-12"
    >
      <ChainLogo className="shrink-0 text-xl" id={network.id} />
      <div className="flex grow flex-col gap-2 overflow-hidden text-left">
        <div className="text-body truncate">{network.name}</div>
        <div className="text-body-secondary truncate text-xs">{network.blockExplorerUrls[0]}</div>
      </div>
      <div className="flex gap-6">
        <ExternalLinkIcon className="text-md" />
      </div>
    </button>
  )
}

export const ExplorerNetworkPicker: FC<{ address: string; onClose: () => void }> = ({
  address,
  onClose,
}) => {
  const { t } = useTranslation()
  const [search, setSearch] = useState("")
  const networks = useExplorerNetworks(address, search)

  const handleNetworkClick = useCallback(
    (network: Network) => () => {
      if (!network.blockExplorerUrls.length) return
      window.open(urlJoin(network.blockExplorerUrls[0], "address", address), "_blank")
      onClose()
    },
    [address, onClose],
  )

  return (
    <div id="copy-address-modal" className="flex h-full w-full flex-col overflow-hidden bg-black">
      <div className="flex h-32 w-full shrink-0 items-center px-12">
        <div className="w-12"></div>
        <div className="text-body-secondary grow text-center">{t("View on explorer")}</div>
        <IconButton onClick={onClose}>
          <XIcon />
        </IconButton>
      </div>
      <div className="flex grow flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <SearchInput onChange={setSearch} placeholder={t("Search by network name")} autoFocus />
        </div>
        <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
          {networks.map((network) => (
            <NetworkRow key={network.id} network={network} onClick={handleNetworkClick(network)} />
          ))}
          {!networks.length && (
            <div className="text-body-secondary flex h-32 items-center px-12">
              {t("No network match your search")}
            </div>
          )}
        </ScrollContainer>
      </div>
    </div>
  )
}
