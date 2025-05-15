import { InfoIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { activeEvmNetworksStore, isEvmNetworkActive, SimpleEvmNetwork } from "extension-core"
import { FC, useCallback, useMemo, useRef, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useIntersection } from "react-use"
import { Checkbox, Drawer, IconButton } from "talisman-ui"

import { AppPill } from "@talisman/components/AppPill"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { api } from "@ui/api"
import { useCurrentSite } from "@ui/hooks/useCurrentSite"
import { useDebouncedState } from "@ui/hooks/useDebouncedState"
import {
  useActiveEvmNetworksState,
  useAuthorisedSites,
  useEvmNetwork,
  useEvmNetworks,
} from "@ui/state"

import { NetworkLogo } from "./NetworkLogo"

const searchNetworks = (
  networks: SimpleEvmNetwork[],
  currentNetworkId: string | undefined,
  search: string,
) => {
  const lowerSearch = search.toLowerCase()
  return networks
    .filter((n) => n.name?.toLowerCase().includes(lowerSearch))
    .sort((n1, n2) => {
      if (n1.id === currentNetworkId) return -1
      if (n2.id === currentNetworkId) return 1
      return (n1.name ?? "").localeCompare(n2.name ?? "")
    })
}

const DrawerContent: FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation()
  const currentSite = useCurrentSite()
  const authorisedSites = useAuthorisedSites()
  const site = useMemo(
    () => (currentSite?.id ? authorisedSites[currentSite?.id] : null),
    [authorisedSites, currentSite?.id],
  )
  // persist initial setting to prevent reordering when changing networks
  const [initialNetworkId] = useState(() => site?.ethChainId?.toString())
  const currentNetwork = useEvmNetwork(initialNetworkId)
  const [isTestnet] = useState(() => !!currentNetwork?.isTestnet)
  const [settingUseTestnets, setUseTestnets] = useState(isTestnet)

  // show testnets only if initial network was a testnet when opening the drawer, or if testnets are enabled in settings
  const showTestnets = useMemo(
    () => isTestnet || settingUseTestnets,
    [isTestnet, settingUseTestnets],
  )

  const evmNetworks = useEvmNetworks({ activeOnly: false, includeTestnets: showTestnets })
  const activeEvmNetworksState = useActiveEvmNetworksState()

  const [allActiveEvmNetworks, allInactiveEvmNetworks] = useMemo(() => {
    return evmNetworks.reduce(
      (acc, network) => {
        const arr = isEvmNetworkActive(network, activeEvmNetworksState) ? acc[0] : acc[1]
        arr.push(network)
        return acc
      },
      [[] as SimpleEvmNetwork[], [] as SimpleEvmNetwork[]],
    )
  }, [activeEvmNetworksState, evmNetworks])

  const [search, setSearch] = useDebouncedState("", 150)

  const [activeEvmNetworks, inactiveEvmNetworks] = useMemo(() => {
    return [
      searchNetworks(allActiveEvmNetworks, currentNetwork?.id, search),
      searchNetworks(allInactiveEvmNetworks, currentNetwork?.id, search),
    ]
  }, [allActiveEvmNetworks, allInactiveEvmNetworks, currentNetwork?.id, search])

  const handleNetworkClick = useCallback(
    async (id: string) => {
      const ethChainId = Number(id)
      if (!currentSite?.id || isNaN(ethChainId)) return
      if (!activeEvmNetworksState[id]) await activeEvmNetworksStore.setActive(id, true)
      await api.authorizedSiteUpdate(currentSite.id, { ethChainId })
      onClose()
    },
    [activeEvmNetworksState, currentSite.id, onClose],
  )

  const handleManageNetworksClick = useCallback(async () => {
    await api.dashboardOpen("/settings/networks-tokens/networks/ethereum")
    onClose()
  }, [onClose])

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="px-12">
        <div className="font-bold">{t("Select Network")}</div>
        <div className="mt-8 flex w-full items-center justify-between">
          <div className="text-body-secondary text-sm">{t("Select EVM network for this site")}</div>
          <Checkbox
            className={classNames("text-xs", isTestnet && "opacity-50")}
            checked={showTestnets}
            disabled={isTestnet}
            onChange={(e) => setUseTestnets(e.target.checked)}
          >
            <span className="text-body-secondary">{t("Enable testnets")}</span>
          </Checkbox>
        </div>
        <div className="my-8">
          <SearchInput
            small={false}
            containerClassName="h-28"
            placeholder={t("Search networks")}
            onChange={setSearch}
          />
        </div>
      </div>
      <ScrollContainer className="scrollable grow" innerClassName="px-12 flex flex-col gap-4 pb-12">
        {!!activeEvmNetworks.length && (
          <div className="text-body-secondary text-xs">{t("Active networks")}</div>
        )}
        <NetworkRows
          networks={activeEvmNetworks}
          selectedNetworkId={currentNetwork?.id}
          onSelect={handleNetworkClick}
        />
        {!!inactiveEvmNetworks.length && (
          <>
            <div
              className={classNames(
                "text-body-secondary text-xs",
                !!activeEvmNetworks.length && "mt-4",
              )}
            >
              {t("Inactive networks")}
            </div>
            <div className="bg-black-tertiary text-body-secondary flex w-full items-center gap-4 rounded-sm px-6 py-4">
              <div className="shrink-0">
                <InfoIcon className="text-base" />
              </div>
              <div className="leading-paragraph grow text-xs">
                <Trans
                  components={{
                    Link: (
                      <button
                        type="button"
                        className="text-body"
                        onClick={handleManageNetworksClick}
                      ></button>
                    ),
                  }}
                  defaults="Click to activate and select network. For full management, visit <Link>Manage Networks</Link>."
                />
              </div>
            </div>
          </>
        )}
        <NetworkRows
          networks={inactiveEvmNetworks}
          selectedNetworkId={currentNetwork?.id}
          onSelect={handleNetworkClick}
        />
      </ScrollContainer>
    </div>
  )
}

const NETWORK_VISIBILITY_OPTIONS: IntersectionObserverInit = {
  root: null,
  rootMargin: "100px",
}

const NetworkButton: FC<{
  network: SimpleEvmNetwork
  isSelected: boolean
  onClick: () => void
}> = ({ network, isSelected, onClick }) => {
  const { t } = useTranslation()

  const ref = useRef<HTMLDivElement>(null)
  const intersection = useIntersection(ref, NETWORK_VISIBILITY_OPTIONS)

  return (
    <div ref={ref} className="h-28 w-full shrink-0">
      {!!intersection?.isIntersecting && (
        <button
          key={network.id}
          type="button"
          onClick={onClick}
          className="bg-field hover:bg-grey-750 flex h-28 w-full shrink-0 items-center gap-6 rounded-sm px-6"
        >
          <NetworkLogo className="shrink-0 text-xl" ethChainId={network.id} />
          <div className="grow truncate text-left">{network?.name}</div>
          {!!network.isTestnet && (
            <div className="bg-alert-warn/10 text-alert-warn inline-block rounded p-4 text-xs font-light">
              {t("Testnet")}
            </div>
          )}
          <div
            className={classNames(
              "mx-4 h-4 w-4 shrink-0 rounded-full",
              isSelected ? "bg-primary" : "bg-grey-700",
            )}
          ></div>
        </button>
      )}
    </div>
  )
}

const NetworkRows: FC<{
  networks: SimpleEvmNetwork[]
  selectedNetworkId?: string
  onSelect: (networkId: string) => void
}> = ({ networks, selectedNetworkId, onSelect }) => {
  const handleNetworkClick = useCallback(
    (id: string) => () => {
      onSelect(id)
    },
    [onSelect],
  )

  if (!networks.length) return null

  return (
    <div className="flex flex-col gap-4">
      {networks.map((network) => (
        <NetworkButton
          key={network.id}
          network={network}
          isSelected={network.id === selectedNetworkId}
          onClick={handleNetworkClick(network.id)}
        />
      ))}
    </div>
  )
}

export const EvmNetworkSelectDrawer: FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { id, url } = useCurrentSite()

  if (!id) return null

  return (
    <Drawer
      className="w-full"
      containerId="main"
      anchor="right"
      isOpen={isOpen}
      onDismiss={onClose}
    >
      <div className="flex h-full flex-col overflow-hidden bg-black">
        <header className="px-12 py-10 text-center">
          <AppPill url={url} />
          <IconButton className="absolute right-10 top-10" onClick={onClose}>
            <XIcon />
          </IconButton>
        </header>
        <DrawerContent onClose={onClose} />
      </div>
    </Drawer>
  )
}
