import { isCustomEvmNetwork } from "@talismn/chaindata-provider"
import { ChevronRightIcon, InfoIcon, LoaderIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  ActiveEvmNetworks,
  activeEvmNetworksStore,
  isEvmNetworkActive,
  SimpleEvmNetwork,
} from "extension-core"
import { ChangeEventHandler, FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button, ListButton, Modal, ModalDialog, Radio, Toggle, useOpenClose } from "talisman-ui"

import { sendAnalyticsEvent } from "@ui/api/analytics"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import {
  useActiveEvmNetworksState,
  useBalances,
  useEvmNetworks,
  useIsBalanceInitializing,
  useRemoteConfig,
} from "@ui/state"

import { ANALYTICS_PAGE } from "./analytics"
import { CustomPill, TestnetPill } from "./Pills"

export const EvmNetworksList: FC<{
  activeOnly: boolean
  search?: string
}> = ({ activeOnly, search }) => {
  const { t } = useTranslation("admin")

  const { recommendedNetworks } = useRemoteConfig()
  const evmNetworks = useEvmNetworks()

  const allSortedNetworks = useMemo(() => {
    return evmNetworks.concat().sort((n1, n2) => {
      const idx1 = recommendedNetworks?.indexOf(n1.id) ?? -1
      const idx2 = recommendedNetworks?.indexOf(n2.id) ?? -1

      if ([idx1, idx2].some((v) => v > -1)) {
        if (idx1 === -1) return 1
        if (idx2 === -1) return -1
        return idx1 - idx2
      }

      if (n1.isTestnet && !n2.isTestnet) return 1
      if (!n1.isTestnet && n2.isTestnet) return -1

      return (n1.name ?? "").localeCompare(n2.name ?? "")
    })
  }, [evmNetworks, recommendedNetworks])

  const networksActiveState = useActiveEvmNetworksState()

  const [filteredEvmNetworks, exactMatches] = useMemo(() => {
    const lowerSearch = search?.toLowerCase() ?? ""

    const filter = (network: SimpleEvmNetwork) => {
      if (!lowerSearch && activeOnly && !isEvmNetworkActive(network, networksActiveState))
        return false

      return (
        network.name?.toLowerCase().includes(lowerSearch) ||
        network.nativeToken?.id.toLowerCase().includes(lowerSearch)
      )
    }

    const filtered = allSortedNetworks.filter(filter)
    const exactMatches = filtered.flatMap((network) =>
      lowerSearch.trim() === network.name?.toLowerCase().trim() ||
      lowerSearch.trim() === network.nativeToken?.id.toLowerCase().trim()
        ? [network.id]
        : [],
    )

    return [filtered, exactMatches] as const
  }, [allSortedNetworks, networksActiveState, search, activeOnly])

  // bump exact matches to the top of the list
  const sortedNetworks = useMemo(() => {
    if (exactMatches.length < 1) return filteredEvmNetworks

    return filteredEvmNetworks.sort((a, b) => {
      const aExactMatch = exactMatches.includes(a.id)
      const bExactMatch = exactMatches.includes(b.id)
      if (aExactMatch && !bExactMatch) return -1
      if (bExactMatch && !aExactMatch) return 1
      return 0
    })
  }, [exactMatches, filteredEvmNetworks])

  const ocResetAllModal = useOpenClose()
  const ocActivateAllModal = useOpenClose()
  const ocDeactivateAllModal = useOpenClose()

  if (!sortedNetworks.length)
    return (
      <div className="text-body-secondary bg-grey-850 rounded-sm p-12 text-center">
        {t("No networks found")}
      </div>
    )

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
          onClick={() => ocResetAllModal.open()}
          className="text-body-disabled hover:text-body-secondary text-xs"
        >
          {t("Reset")}
        </button>
        <div className="bg-body-disabled h-6 w-0.5"></div>
        <button
          type="button"
          onClick={() => ocActivateAllModal.open()}
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
        <Modal isOpen={ocResetAllModal.isOpen} onDismiss={ocResetAllModal.close}>
          <ResetAllNetworksModalContent onClose={ocResetAllModal.close} />
        </Modal>
        <Modal isOpen={ocActivateAllModal.isOpen} onDismiss={ocActivateAllModal.close}>
          <ActivateNetworksModalContent onClose={ocActivateAllModal.close} />
        </Modal>
        <Modal isOpen={ocDeactivateAllModal.isOpen} onDismiss={ocDeactivateAllModal.close}>
          <DeactivateNetworksModalContent onClose={ocDeactivateAllModal.close} />
        </Modal>
      </div>
      <VirtualizedRows networks={sortedNetworks} activeNetworksState={networksActiveState} />
    </div>
  )
}

const VirtualizedRows: FC<{
  networks: SimpleEvmNetwork[]
  activeNetworksState: ActiveEvmNetworks
}> = ({ networks, activeNetworksState }) => {
  const virtualizer = useVirtualizer({
    count: networks.length,
    overscan: 6,
    gap: 8,
    estimateSize: () => 56,
    getScrollElement: () => document.getElementById("main"),
  })

  return (
    <div>
      <div
        className="relative w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            className="absolute left-0 top-0 w-full"
            style={{
              height: `${item.size}px`,
              transform: `translateY(${item.start}px)`,
            }}
          >
            <EvmNetworksRow
              network={networks[item.index]}
              activeNetworksState={activeNetworksState}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

const EvmNetworksRow: FC<{
  network: SimpleEvmNetwork
  activeNetworksState: ActiveEvmNetworks
}> = ({ network, activeNetworksState }) => {
  const isActive = useMemo(
    () => isEvmNetworkActive(network, activeNetworksState),
    [activeNetworksState, network],
  )

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

  const handleEnableChanged: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      activeEvmNetworksStore.setActive(network.id, e.target.checked)
    },
    [network.id],
  )

  return (
    <div className="relative h-28">
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
    </div>
  )
}

const ResetAllNetworksModalContent: FC<{
  onClose: () => void
}> = ({ onClose }) => {
  const { t } = useTranslation()

  const handleClick = useCallback(async () => {
    activeEvmNetworksStore.mutate(() => ({}))
    onClose()
  }, [onClose])

  return (
    <ModalDialog title={t("Reset Ethereum networks")} onClose={onClose}>
      <div className="text-body-secondary mb-8 text-sm">
        {t("This will reset active state of all Ethereum networks to their Talisman defaults.")}
      </div>

      <div className="mt-4 flex justify-end gap-8">
        <Button onClick={onClose}>{t("Cancel")}</Button>
        <Button primary onClick={handleClick}>
          {t("Reset")}
        </Button>
      </div>
    </ModalDialog>
  )
}

type ActivateMode = "recommended" | "all"

const ActivateNetworksModalContent: FC<{
  onClose: () => void
}> = ({ onClose }) => {
  const { t } = useTranslation("admin")

  const evmNetworks = useEvmNetworks()
  const activeNetworks = useActiveEvmNetworksState()

  const recommendedNetworkIds = useMemo(() => {
    return evmNetworks
      .filter((n) => n.isDefault)
      .filter((n) => !isEvmNetworkActive(n, activeNetworks))
      .map((n) => n.id)
  }, [activeNetworks, evmNetworks])

  const allNetworkIds = useMemo(() => {
    return evmNetworks.filter((n) => !isEvmNetworkActive(n, activeNetworks)).map((n) => n.id)
  }, [activeNetworks, evmNetworks])

  const [mode, setMode] = useState<ActivateMode>("recommended")

  const networkIdsToActivate = useMemo(
    () => (mode === "all" ? allNetworkIds : recommendedNetworkIds),
    [allNetworkIds, mode, recommendedNetworkIds],
  )

  const handleClick = useCallback(async () => {
    activeEvmNetworksStore.mutate((prev) => ({
      ...prev,
      ...Object.fromEntries(networkIdsToActivate.map((chainId) => [chainId, true])),
    }))

    onClose()
  }, [networkIdsToActivate, onClose])

  return (
    <ModalDialog title={t("Activate Ethereum networks")} onClose={onClose}>
      <div className="text-body-secondary mb-8 text-sm">
        {t(
          "It is recommended to activate only networks on which you own tokens, to improve Talisman performance.",
        )}
      </div>

      <div className="text-body-secondary flex flex-col items-start py-8 text-sm">
        <Radio
          name="activateMode"
          label={t("Activate recommended Ethereum networks ({{count}})", {
            count: recommendedNetworkIds.length,
          })}
          value="recommended"
          checked={mode === "recommended"}
          onChange={() => setMode("recommended")}
        />
        <Radio
          name="activateMode"
          label={t("Activate all Ethereum networks ({{count}})", {
            count: allNetworkIds.length,
          })}
          value="all"
          checked={mode === "all"}
          onChange={() => setMode("all")}
        />
      </div>

      <div className="mt-4 flex justify-end gap-8">
        <Button onClick={onClose}>{t("Cancel")}</Button>
        <Button primary disabled={!networkIdsToActivate.length} onClick={handleClick}>
          {t("Activate")}
        </Button>
      </div>
    </ModalDialog>
  )
}

type DeactivateMode = "all" | "unused"

const DeactivateNetworksModalContent: FC<{
  onClose: () => void
}> = ({ onClose }) => {
  const { t } = useTranslation("admin")
  const isBalancesInitializing = useIsBalanceInitializing()

  const balances = useBalances("all")
  const evmNetworks = useEvmNetworks({ activeOnly: true, includeTestnets: true })

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
