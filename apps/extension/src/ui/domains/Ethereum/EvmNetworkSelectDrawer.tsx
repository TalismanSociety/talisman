import { AppPill } from "@talisman/components/AppPill"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { useAuthorisedSites } from "@ui/hooks/useAuthorisedSites"
import { useCurrentSite } from "@ui/hooks/useCurrentSite"
import { useDebouncedState } from "@ui/hooks/useDebouncedState"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useSetting } from "@ui/hooks/useSettings"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Drawer } from "talisman-ui"
import { IconButton } from "talisman-ui"

import { NetworkLogo } from "./NetworkLogo"

const DrawerContent: FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation()
  const currentSite = useCurrentSite()
  const authorisedSites = useAuthorisedSites()
  const site = useMemo(
    () => (currentSite?.id ? authorisedSites[currentSite?.id] : null),
    [authorisedSites, currentSite?.id]
  )
  // persist initial setting to prevent reordering when changing networks
  const [initialNetworkId] = useState(() => site?.ethChainId?.toString())
  const currentNetwork = useEvmNetwork(initialNetworkId)
  const [isTestnet] = useState(() => !!currentNetwork?.isTestnet)
  const [settingUseTestnets] = useSetting("useTestnets")

  // show testnets only if initial network was a testnet when opening the drawer, or if testnets are enabled in settings
  const showTestnets = useMemo(
    () => isTestnet || settingUseTestnets,
    [isTestnet, settingUseTestnets]
  )

  const { evmNetworks } = useEvmNetworks({ activeOnly: true, includeTestnets: showTestnets })

  const [search, setSearch] = useDebouncedState("", 150)

  const networks = useMemo(() => {
    const lowerSearch = search.toLowerCase()
    return evmNetworks
      .filter((n) => n.name?.toLowerCase().includes(lowerSearch))
      .sort((n1, n2) => {
        if (n1.id === currentNetwork?.id) return -1
        if (n2.id === currentNetwork?.id) return 1
        return (n1.name ?? "").localeCompare(n2.name ?? "")
      })
  }, [currentNetwork?.id, evmNetworks, search])

  const handleNetworkClick = useCallback(
    (id: string) => async () => {
      const ethChainId = Number(id)
      if (!currentSite?.id || isNaN(ethChainId)) return
      await api.authorizedSiteUpdate(currentSite.id, { ethChainId })
      onClose()
    },
    [currentSite.id, onClose]
  )

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="px-12">
        <div className="font-bold">{t("Select Network")}</div>
        <div className="text-body-secondary mt-2 text-sm">
          {t("Select the EVM network for the current site")}
        </div>
        <div className="my-8">
          <SearchInput
            small={false}
            containerClassName="h-28"
            placeholder={t("Network name")}
            onChange={setSearch}
          />
        </div>
      </div>
      <ScrollContainer className="scrollable grow" innerClassName="px-12 flex flex-col gap-2 pb-12">
        {networks.map((network) => (
          <button
            key={network.id}
            type="button"
            onClick={handleNetworkClick(network.id)}
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
                network.id === currentNetwork?.id ? "bg-primary" : "bg-grey-700"
              )}
            ></div>
          </button>
        ))}
      </ScrollContainer>
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
