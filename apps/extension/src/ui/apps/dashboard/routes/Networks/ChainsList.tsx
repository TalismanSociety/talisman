import { Chain, isCustomChain } from "@talismn/chaindata-provider"
import { ChevronRightIcon, InfoIcon, LoaderIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ActiveChains, activeChainsStore, isChainActive } from "extension-core"
import { ChangeEventHandler, FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button, ListButton, Modal, ModalDialog, Radio, Toggle, useOpenClose } from "talisman-ui"

import { sendAnalyticsEvent } from "@ui/api/analytics"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import {
  useActiveChainsState,
  useBalances,
  useChains,
  useIsBalanceInitializing,
  useRemoteConfig,
} from "@ui/state"

import { ANALYTICS_PAGE } from "./analytics"
import { CustomPill, TestnetPill } from "./Pills"

export const ChainsList: FC<{ activeOnly: boolean; showTestnets: boolean; search?: string }> = ({
  activeOnly,
  showTestnets,
  search,
}) => {
  const { t } = useTranslation("admin")
  const { recommendedNetworks } = useRemoteConfig()
  const networksActiveState = useActiveChainsState()
  const chains = useChains({ activeOnly: false, includeTestnets: showTestnets })

  const allSortedNetworks = useMemo(() => {
    return chains.concat().sort((n1, n2) => {
      const idx1 = recommendedNetworks?.indexOf(n1.id) ?? -1
      const idx2 = recommendedNetworks?.indexOf(n2.id) ?? -1

      if ([idx1, idx2].some((v) => v > -1)) {
        if (idx1 === -1) return 1
        if (idx2 === -1) return -1
        return idx1 - idx2
      }

      return (n1.name ?? "").localeCompare(n2.name ?? "")
    })
  }, [chains, recommendedNetworks])

  const [filteredChains, exactMatches] = useMemo(() => {
    const lowerSearch = search?.toLowerCase() ?? ""

    const filter = (network: Chain) => {
      if (activeOnly && !isChainActive(network, networksActiveState)) return false

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
  }, [search, allSortedNetworks, activeOnly, networksActiveState])

  const sortedChains = useMemo(() => {
    if (exactMatches.length < 1) return filteredChains

    // put exact matches at the top of the list
    return filteredChains.sort((a, b) => {
      const aExactMatch = exactMatches.includes(a.id)
      const bExactMatch = exactMatches.includes(b.id)
      if (aExactMatch && !bExactMatch) return -1
      if (bExactMatch && !aExactMatch) return 1
      return 0
    })
  }, [exactMatches, filteredChains])

  const activateAll = useCallback(
    (activate = false) =>
      () => {
        activeChainsStore.set(Object.fromEntries(filteredChains.map((n) => [n.id, activate])))
      },
    [filteredChains],
  )

  const ocResetAllModal = useOpenClose()
  const ocActivateAllModal = useOpenClose()
  const ocDeactivateAllModal = useOpenClose()

  if (!sortedChains.length)
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
          !filteredChains.length && "invisible",
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
          onClick={activateAll(true)}
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
          <ActivateNetworksModalContent
            showTestnets={showTestnets}
            onClose={ocActivateAllModal.close}
          />
        </Modal>
        <Modal isOpen={ocDeactivateAllModal.isOpen} onDismiss={ocDeactivateAllModal.close}>
          <DeactivateNetworksModalContent
            showTestnets={showTestnets}
            onClose={ocDeactivateAllModal.close}
          />
        </Modal>
      </div>
      <VirtualizedRows networks={sortedChains} activeNetworksState={networksActiveState} />
    </div>
  )
}

const VirtualizedRows: FC<{
  networks: Chain[]
  activeNetworksState: ActiveChains
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
            <ChainRow network={networks[item.index]} activeNetworksState={activeNetworksState} />
          </div>
        ))}
      </div>
    </div>
  )
}

const ChainRow: FC<{
  network: Chain
  activeNetworksState: ActiveChains
}> = ({ network: chain, activeNetworksState: activeChainsState }) => {
  const isActive = useMemo(
    () => isChainActive(chain, activeChainsState),
    [activeChainsState, chain],
  )

  const navigate = useNavigate()
  const handleChainClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "chain settings button",
      properties: {
        chainId: chain.id,
      },
    })
    navigate(`./${chain.id}`)
  }, [navigate, chain.id])

  const handleEnableChanged: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      activeChainsStore.setActive(chain.id, e.target.checked)
    },
    [chain.id],
  )

  return (
    <div className="relative h-28">
      <ListButton key={chain.id} role="button" onClick={handleChainClick}>
        <ChainLogo className="rounded-full text-xl" id={chain.id} />
        <div className="text-body truncate">{chain.name}</div>
        {chain.isTestnet && <TestnetPill />}
        {isCustomChain(chain) && <CustomPill />}
        <div className="min-w-[4.4rem] shrink-0 grow"></div>
        <ChevronRightIcon className="transition-noneshrink-0 text-lg" />
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
    activeChainsStore.mutate(() => ({}))
    onClose()
  }, [onClose])

  return (
    <ModalDialog title={t("Reset Polkadot networks")} onClose={onClose}>
      <div className="text-body-secondary mb-8 text-sm">
        {t("This will reset active state of all Polkadot networks to their Talisman defaults.")}
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
  showTestnets: boolean
  onClose: () => void
}> = ({ showTestnets, onClose }) => {
  const { t } = useTranslation("admin")

  const networks = useChains({ activeOnly: false, includeTestnets: showTestnets })
  const activeNetworks = useActiveChainsState()

  const recommendedNetworkIds = useMemo(() => {
    // all networks that are either default or have an enabled token
    return networks
      .filter((n) => n.isDefault && (!n.isTestnet || showTestnets))
      .filter((n) => !isChainActive(n, activeNetworks))
      .map((n) => n.id)
  }, [activeNetworks, networks, showTestnets])

  const allNetworkIds = useMemo(() => {
    return networks.filter((n) => !isChainActive(n, activeNetworks)).map((n) => n.id)
  }, [activeNetworks, networks])

  const [mode, setMode] = useState<ActivateMode>("recommended")

  const networkIdsToActivate = useMemo(
    () => (mode === "all" ? allNetworkIds : recommendedNetworkIds),
    [allNetworkIds, mode, recommendedNetworkIds],
  )

  const handleClick = useCallback(async () => {
    activeChainsStore.mutate((prev) => ({
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
  showTestnets: boolean
  onClose: () => void
}> = ({ showTestnets, onClose }) => {
  const { t } = useTranslation("admin")
  const isBalancesInitializing = useIsBalanceInitializing()
  const balances = useBalances("all")
  const chains = useChains({ activeOnly: true, includeTestnets: showTestnets })

  const [activeChainIds, unusedChainIds] = useMemo(() => {
    const networkIds = chains.map((chain) => chain.id)

    return [
      networkIds,
      networkIds.filter((chainId) => !balances.find({ chainId }).sum.planck.total),
    ]
  }, [chains, balances])

  const [mode, setMode] = useState<DeactivateMode>("all")

  const handleClick = useCallback(async () => {
    const networkIds = mode === "all" ? activeChainIds : unusedChainIds

    activeChainsStore.mutate((prev) => ({
      ...prev,
      ...Object.fromEntries(networkIds.map((chainId) => [chainId, false])),
    }))

    onClose()
  }, [activeChainIds, mode, onClose, unusedChainIds])

  const disableSubmit = useMemo(() => {
    if (mode === "unused" && (isBalancesInitializing || !unusedChainIds.length)) return true
    if (mode === "all" && !activeChainIds.length) return true
    return false
  }, [activeChainIds.length, isBalancesInitializing, mode, unusedChainIds.length])

  return (
    <ModalDialog title={t("Deactivate Polkadot networks")} onClose={onClose}>
      <div className="text-body-secondary mb-8 text-sm">
        {t("It is recommended to deactivate unused networks to improve Talisman performance.")}
      </div>
      <div className="bg-grey-800 text-body-secondary flex h-28 w-full items-center gap-6 rounded-sm px-8 text-sm">
        {isBalancesInitializing ? (
          <>
            <LoaderIcon className="text-md shrink-0 animate-spin" />
            <div className="grow">
              {t("Scanning networks - found {{count}} unused", { count: unusedChainIds.length })}
            </div>
          </>
        ) : (
          <>
            <InfoIcon className="text-md shrink-0" />
            <div className="text-body-secondary grow">
              {t("Found {{count}} network(s) without token balances", {
                count: unusedChainIds.length,
              })}
            </div>
          </>
        )}
      </div>
      <div className="text-body-secondary flex flex-col items-start py-8 text-sm">
        <Radio
          name="deactivateMode"
          label={t("Deactivate all Polkadot networks ({{count}})", { count: chains.length })}
          value="all"
          checked={mode === "all"}
          onChange={() => setMode("all")}
        />
        <Radio
          name="deactivateMode"
          label={t("Deactivate unused Polkadot networks ({{count}})", {
            count: unusedChainIds.length,
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
