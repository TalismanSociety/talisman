import { isAccountCompatibleWithChain } from "@extension/core"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { ExternalLinkIcon, XIcon } from "@talismn/icons"
import { isEthereumAddress } from "@talismn/util"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import { useBalancesFiatTotalPerNetwork } from "@ui/hooks/useBalancesFiatTotalPerNetwork"
import useChains from "@ui/hooks/useChains"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useSetting } from "@ui/hooks/useSettings"
import { isAddressCompatibleWithChain } from "@ui/util/isAddressCompatibleWithChain"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { IconButton } from "talisman-ui"
import urlJoin from "url-join"

import { ChainLogo } from "../Asset/ChainLogo"

type NetworkWithExplorer = {
  id: string
  type: "evm" | "substrate"
  name: string
  explorerUrl: string
}

const useExplorerNetworks = (address: string, search: string): NetworkWithExplorer[] => {
  const account = useAccountByAddress(address)
  const [includeTestnets] = useSetting("useTestnets")
  const { chains } = useChains({ activeOnly: true, includeTestnets })
  const { evmNetworks } = useEvmNetworks({ activeOnly: true, includeTestnets })
  const balances = useBalancesByAddress(address)
  const balancesPerNetwork = useBalancesFiatTotalPerNetwork(balances)

  const compatibleChains = useMemo<NetworkWithExplorer[]>(
    () =>
      chains
        .filter(
          (chain) =>
            !!chain.subscanUrl &&
            !!chain.name &&
            // account is undefined for contacts
            (account
              ? isAccountCompatibleWithChain(chain, account.type ?? "sr25519", account.genesisHash)
              : isAddressCompatibleWithChain(chain, address))
        )
        .map(
          (chain): NetworkWithExplorer => ({
            id: chain.id,
            type: "substrate",
            name: chain.name!,
            explorerUrl: chain.subscanUrl!,
          })
        ),
    [account, address, chains]
  )

  const compatibleEvmNetworks = useMemo<NetworkWithExplorer[]>(
    () =>
      isEthereumAddress(address)
        ? evmNetworks
            .filter((network) => !!network.name && !!network.explorerUrl)
            .map(
              (chain): NetworkWithExplorer => ({
                id: chain.id,
                type: "substrate",
                name: chain.name!,
                explorerUrl: chain.explorerUrl!,
              })
            )
        : [],
    [address, evmNetworks]
  )

  const sortedNetworks = useMemo(
    () =>
      [...compatibleChains, ...compatibleEvmNetworks].sort((a, b) => {
        if (balancesPerNetwork[a.id] || balancesPerNetwork[b.id])
          return (balancesPerNetwork[b.id] ?? 0) - (balancesPerNetwork[a.id] ?? 0)
        return (a.name ?? "").localeCompare(b.name ?? "")
      }),
    [balancesPerNetwork, compatibleChains, compatibleEvmNetworks]
  )

  return useMemo(() => {
    const lowerSearch = search.toLowerCase()
    return sortedNetworks.filter((network) => network.name?.toLowerCase().includes(lowerSearch))
  }, [search, sortedNetworks])
}

const NetworkRow: FC<{ network: NetworkWithExplorer; onClick: () => void }> = ({
  network,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-body-secondary hover:text-body hover:bg-grey-800 flex h-32 w-full items-center gap-6 px-12"
    >
      <ChainLogo className="shrink-0 text-xl" id={network.id} />
      <div className="flex grow flex-col gap-2 overflow-hidden text-left">
        <div className="text-body truncate">{network.name}</div>
        <div className="text-body-secondary truncate text-xs">{network.explorerUrl}</div>
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
    (network: NetworkWithExplorer) => () => {
      window.open(urlJoin(network.explorerUrl, "address", address), "_blank")
      onClose()
    },
    [address, onClose]
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
