import { isCustomEvmNetwork } from "@talismn/chaindata-provider"
import { ChevronRightIcon, InfoIcon, LoaderIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import sortBy from "lodash/sortBy"
import { ChangeEventHandler, FC, Suspense, useCallback, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useIntersection } from "react-use"
import { Button, ListButton, Modal, ModalDialog, Radio, Toggle, useOpenClose } from "talisman-ui"

import { activeEvmNetworksStore, EvmNetwork, isEvmNetworkActive } from "@extension/core"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { sendAnalyticsEvent } from "@ui/api/analytics"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import {
  useActiveEvmNetworksState,
  useBalances,
  useEvmNetworks,
  useIsBalanceInitializing,
  useSetting,
} from "@ui/state"

import { ANALYTICS_PAGE } from "./analytics"
import { CustomPill, TestnetPill } from "./Pills"

type DeactivateMode = "all" | "unused"

const DeactivateNetworksModalContent: FC<{
  onClose: () => void
}> = ({ onClose }) => {
  const { t } = useTranslation("admin")
  const isBalancesInitializing = useIsBalanceInitializing()

  const [includeTestnets] = useSetting("useTestnets")
  const balances = useBalances("all")
  const evmNetworks = useEvmNetworks({ activeOnly: true, includeTestnets })

  const [activeEvmNetworkIds, unusedEvmNetworkIds] = useMemo(() => {
    const networkIds = evmNetworks.map((chain) => chain.id)

    return [
      networkIds,
      networkIds.filter((evmNetworkId) => !balances.find({ evmNetworkId }).sum.planck.total),
    ]
  }, [evmNetworks, balances])

  const [mode, setMode] = useState<DeactivateMode>("all")

  const handleClick = useCallback(async () => {
    const networkIds = mode === "all" ? activeEvmNetworkIds : unusedEvmNetworkIds

    activeEvmNetworksStore.mutate((prev) => ({
      ...prev,
      ...Object.fromEntries(networkIds.map((chainId) => [chainId, false])),
    }))

    onClose()
  }, [activeEvmNetworkIds, mode, onClose, unusedEvmNetworkIds])

  const disableSubmit = useMemo(() => {
    if (mode === "unused" && (isBalancesInitializing || !unusedEvmNetworkIds.length)) return true
    if (mode === "all" && !activeEvmNetworkIds.length) return true
    return false
  }, [activeEvmNetworkIds.length, isBalancesInitializing, mode, unusedEvmNetworkIds.length])

  return (
    <ModalDialog title={t("Deactivate Ethereum networks")} onClose={onClose}>
      <div className="text-body-secondary mb-8 text-sm">
        {t("It is recommended to deactivate unused networks to improve Talisman performance.")}
      </div>
      <div className="bg-grey-800 text-body-secondary flex h-28 w-full items-center gap-6 rounded-sm px-8 text-sm">
        {isBalancesInitializing ? (
          <>
            <LoaderIcon className="text-md shrink-0 animate-spin" />
            <div className="grow">
              {t("Scanning networks - found {{count}} unused", {
                count: unusedEvmNetworkIds.length,
              })}
            </div>
          </>
        ) : (
          <>
            <InfoIcon className="text-md shrink-0" />
            <div className="text-body-secondary grow">
              {t("Found {{count}} network(s) without token balances", {
                count: unusedEvmNetworkIds.length,
              })}
            </div>
          </>
        )}
      </div>
      <div className="text-body-secondary flex flex-col items-start py-8 text-sm">
        <Radio
          name="deactivateMode"
          label={t("Deactivate all Ethereum networks ({{count}})", {
            count: evmNetworks.length,
          })}
          value="all"
          checked={mode === "all"}
          onChange={() => setMode("all")}
        />
        <Radio
          name="deactivateMode"
          label={t("Deactivate unused Ethereum networks ({{count}})", {
            count: unusedEvmNetworkIds.length,
          })}
          value="unused"
          checked={mode === "unused"}
          onChange={() => setMode("unused")}
        />
      </div>

      <div className="mt-4 flex justify-end gap-8">
        <Button onClick={onClose}>{t("Cancel")}</Button>
        <Button primary disabled={disableSubmit} onClick={handleClick}>
          {t("Deactivate")}
        </Button>
      </div>
    </ModalDialog>
  )
}

export const EvmNetworksList = ({ search }: { search?: string }) => {
  const { t } = useTranslation("admin")

  const [includeTestnets] = useSetting("useTestnets")
  const evmNetworks = useEvmNetworks({
    activeOnly: false,
    includeTestnets,
  })

  const networksActiveState = useActiveEvmNetworksState()

  const [filteredEvmNetworks, exactMatches] = useMemo(() => {
    const lowerSearch = search?.toLowerCase() ?? ""

    const filter = (network: EvmNetwork) => {
      if (!lowerSearch)
        return (
          network.isDefault ||
          networksActiveState[network.id] !== undefined ||
          isCustomEvmNetwork(network)
        )

      return (
        network.name?.toLowerCase().includes(lowerSearch) ||
        network.nativeToken?.id.toLowerCase().includes(lowerSearch)
      )
    }

    const filtered = evmNetworks.filter(filter)
    const exactMatches = filtered.flatMap((network) =>
      lowerSearch.trim() === network.name?.toLowerCase().trim() ||
      lowerSearch.trim() === network.nativeToken?.id.toLowerCase().trim()
        ? [network.id]
        : [],
    )

    return [filtered, exactMatches] as const
  }, [evmNetworks, networksActiveState, search])

  const sortedNetworks = useMemo(() => {
    const byName = sortBy(filteredEvmNetworks, "name")
    if (exactMatches.length < 1) return byName

    // put exact matches at the top of the list
    return byName.sort((a, b) => {
      const aExactMatch = exactMatches.includes(a.id)
      const bExactMatch = exactMatches.includes(b.id)
      if (aExactMatch && !bExactMatch) return -1
      if (bExactMatch && !aExactMatch) return 1
      return 0
    })
  }, [exactMatches, filteredEvmNetworks])

  const handleNetworkActiveChanged = useCallback(
    (network: EvmNetwork) => (enable: boolean) => {
      activeEvmNetworksStore.setActive(network.id, enable)
    },
    [],
  )

  const enableAll = useCallback(
    (enable = false) =>
      () => {
        activeEvmNetworksStore.set(
          Object.fromEntries(filteredEvmNetworks.map((n) => [n.id, enable])),
        )
      },
    [filteredEvmNetworks],
  )

  const ocDeactivateAllModal = useOpenClose()

  if (!sortedNetworks) return null

  return (
    <div className="flex flex-col gap-4">
      <div
        className={classNames(
          "flex w-full items-center justify-end gap-4",
          !filteredEvmNetworks.length && "invisible",
        )}
      >
        <button
          type="button"
          onClick={enableAll(true)}
          className="text-body-disabled hover:text-body-secondary text-xs"
        >
          {t("Activate all")}
        </button>
        <div className="bg-body-disabled h-6 w-0.5"></div>
        <button
          type="button"
          onClick={() => ocDeactivateAllModal.open()}
          className="text-body-disabled hover:text-body-secondary text-xs"
        >
          {t("Deactivate all")}
        </button>
        <Suspense fallback={<SuspenseTracker name="DeactivateAllModal" />}>
          <Modal isOpen={ocDeactivateAllModal.isOpen} onDismiss={ocDeactivateAllModal.close}>
            <DeactivateNetworksModalContent onClose={ocDeactivateAllModal.close} />
          </Modal>
        </Suspense>
      </div>
      {sortedNetworks.map((network) => (
        <EvmNetworksListItem
          key={network.id}
          network={network}
          isActive={isEvmNetworkActive(network, networksActiveState)}
          onEnableChanged={handleNetworkActiveChanged(network)}
        />
      ))}
    </div>
  )
}

const EvmNetworksListItem = ({
  network,
  isActive: isActive,
  onEnableChanged,
}: {
  network: EvmNetwork
  isActive: boolean
  onEnableChanged: (enable: boolean) => void
}) => {
  const navigate = useNavigate()
  const handleNetworkClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "network settings button",
      properties: {
        networkId: network.id.toString(),
      },
    })
    navigate(`./${network.id}`)
  }, [navigate, network.id])

  // there are lots of networks so we should only render visible rows to prevent performance issues
  const refContainer = useRef<HTMLDivElement>(null)
  const intersection = useIntersection(refContainer, {
    root: null,
    rootMargin: "1000px",
  })

  const handleEnableChanged: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      onEnableChanged(e.target.checked)
    },
    [onEnableChanged],
  )

  const rowContent = intersection?.isIntersecting ? (
    <>
      <ListButton key={network.id} role="button" onClick={handleNetworkClick}>
        <ChainLogo className="rounded-full text-xl" id={network.id} />
        <div className="text-body truncate">{network.name}</div>
        {network.isTestnet && <TestnetPill />}
        {isCustomEvmNetwork(network) && <CustomPill />}
        <div className="min-w-[5rem] shrink-0 grow"></div>
        <ChevronRightIcon className="shrink-0 text-lg transition-none" />
      </ListButton>
      <Toggle
        className="absolute right-20 top-4 p-4"
        checked={isActive}
        onChange={handleEnableChanged}
      />
    </>
  ) : null

  return (
    <div ref={refContainer} className="relative h-28">
      {rowContent}
    </div>
  )
}
