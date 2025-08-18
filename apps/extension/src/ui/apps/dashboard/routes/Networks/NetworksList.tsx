import { isNetworkCustom, Network } from "@talismn/chaindata-provider"
import { ChevronRightIcon, InfoIcon, LoaderIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import { ActiveNetworks, activeNetworksStore, isNetworkActive } from "extension-core"
import { startCase } from "lodash-es"
import { ChangeEventHandler, FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button, ListButton, Modal, ModalDialog, Radio, Toggle, useOpenClose } from "talisman-ui"

import { sendAnalyticsEvent } from "@ui/api/analytics"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { NetworkType } from "@ui/domains/Networks/NetworkType"
import {
  useActiveNetworksState,
  useBalances,
  useIsBalanceInitializing,
  useNetworks,
  useRemoteConfig,
} from "@ui/state"

import { ANALYTICS_PAGE } from "./analytics"
import { CustomPill, TestnetPill } from "./Pills"
import { PlatformOption } from "./usePlatformOptions"

export const NetworksList: FC<{
  activeOnly: boolean
  search?: string
  platform: PlatformOption
}> = ({ platform, activeOnly, search }) => {
  const { t } = useTranslation()
  const { recommendedNetworks } = useRemoteConfig()
  const networksActiveState = useActiveNetworksState()

  // keep displayed networks list as state so if activeOnly is on, disabling a network doesnt make it disappear
  const defaultNetworks = useNetworks({ platform, activeOnly })
  const [displayedNetworks, setDisplayedNetworks] = useState<Network[]>(() => defaultNetworks)

  const networks = useNetworks()

  // sort only once
  const allSortedNetworks = useMemo(() => {
    return networks.concat().sort((n1, n2) => {
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
  }, [networks, recommendedNetworks])

  useEffect(() => {
    const lowerSearch = search?.toLowerCase().trim() ?? ""

    const filter = (network: Network) => {
      if (platform !== "all" && network.platform !== platform) return false
      if (activeOnly && !isNetworkActive(network, networksActiveState)) return false

      if (!search) return true

      return (
        network.name?.toLowerCase().includes(lowerSearch) ||
        network.nativeTokenId.toLowerCase().includes(lowerSearch) ||
        network.id === lowerSearch // useful for ethereum networks
      )
    }

    const exactMatchFilter = (network: Network) => {
      if (!lowerSearch) return false

      return (
        lowerSearch === network.name?.toLowerCase().trim() ||
        lowerSearch === network.nativeTokenId.toLowerCase().trim() ||
        network.id === lowerSearch
      )
    }

    const filtered = allSortedNetworks.filter(filter)
    const exactMatches = filtered.filter(exactMatchFilter).map((network) => network.id)

    const ordered = filtered.sort((a, b) => {
      const aExactMatch = exactMatches.includes(a.id)
      const bExactMatch = exactMatches.includes(b.id)
      if (aExactMatch && !bExactMatch) return -1
      if (bExactMatch && !aExactMatch) return 1
      return 0
    })

    setDisplayedNetworks(ordered)

    // ⚠️ We don't want networksActiveState as dependency here, or if activeOnly is true, disabling a network would make it disappear from the list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOnly, allSortedNetworks, platform, search])

  const ocResetAllModal = useOpenClose()
  const ocDeactivateAllModal = useOpenClose()

  if (!displayedNetworks.length)
    return (
      <div className="text-body-secondary bg-grey-850 rounded-sm p-12 text-center">
        {t("No networks found")}
      </div>
    )

  return (
    <div className="flex flex-col gap-4">
      <div className={classNames("flex w-full items-center justify-end gap-4")}>
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
          onClick={() => ocDeactivateAllModal.open()}
          className="text-body-disabled hover:text-body-secondary text-xs"
        >
          {t("Deactivate all")}
        </button>

        <Modal isOpen={ocResetAllModal.isOpen} onDismiss={ocResetAllModal.close}>
          <ResetAllNetworksModalContent platform={platform} onClose={ocResetAllModal.close} />
        </Modal>
        <Modal isOpen={ocDeactivateAllModal.isOpen} onDismiss={ocDeactivateAllModal.close}>
          <DeactivateNetworksModalContent
            platform={platform}
            onClose={ocDeactivateAllModal.close}
          />
        </Modal>
      </div>
      <VirtualizedRows networks={displayedNetworks} activeNetworksState={networksActiveState} />
    </div>
  )
}

const VirtualizedRows: FC<{
  networks: Network[]
  activeNetworksState: ActiveNetworks
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
            <NetworkRow network={networks[item.index]} activeNetworksState={activeNetworksState} />
          </div>
        ))}
      </div>
    </div>
  )
}

const NetworkRow: FC<{
  network: Network
  activeNetworksState: ActiveNetworks
}> = ({ network, activeNetworksState }) => {
  const isActive = useMemo(
    () => isNetworkActive(network, activeNetworksState),
    [activeNetworksState, network],
  )

  const navigate = useNavigate()
  const handleNetworkClick = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "chain settings button",
      properties: {
        chainId: network.id,
      },
    })
    navigate(`/settings/networks-tokens/network/${network.id}`)
  }, [navigate, network.id])

  const handleEnableChanged: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      activeNetworksStore.setActive(network.id, e.target.checked)
    },
    [network.id],
  )

  return (
    <div className="relative h-28" data-testid="network-list-row">
      <ListButton key={network.id} role="button" onClick={handleNetworkClick}>
        <NetworkLogo className="rounded-full text-xl" networkId={network.id} />
        <div className="text-body flex flex-col justify-center gap-1 overflow-hidden">
          <div className="truncate">
            <NetworkName networkId={network.id} />
          </div>
          <div className="text-body-inactive truncate text-xs">
            <NetworkType networkId={network.id} />
          </div>
        </div>
        {network.isTestnet && <TestnetPill />}
        {isNetworkCustom(network) && <CustomPill />}
        <div className="min-w-[4.4rem] shrink-0 grow"></div>
        <ChevronRightIcon className="transition-noneshrink-0 text-lg" />
      </ListButton>
      <Toggle
        className="absolute right-20 top-4 p-4"
        checked={!!isActive}
        onChange={handleEnableChanged}
      />
    </div>
  )
}

const ResetAllNetworksModalContent: FC<{
  platform: PlatformOption
  onClose: () => void
}> = ({ platform, onClose }) => {
  const { t } = useTranslation()
  const networks = useNetworks({ activeOnly: false, includeTestnets: true, platform })

  const handleClick = useCallback(async () => {
    activeNetworksStore.mutate((prev) => {
      const newState = structuredClone(prev)
      for (const networkId of networks.map((network) => network.id)) delete newState[networkId]
      return newState
    })
    onClose()
  }, [networks, onClose])

  return (
    <ModalDialog
      title={
        platform === "all"
          ? t("Reset all networks")
          : t("Reset {{platform}} networks", { platform: startCase(platform) })
      }
      onClose={onClose}
    >
      <p className="text-body-secondary mb-8 text-sm">
        {platform === "all"
          ? t("This will reset active state of all networks to their Talisman defaults.")
          : t(
              "This will reset active state of all {{platform}} networks to their Talisman defaults.",
              { platform },
            )}
      </p>

      <div className="mt-4 flex justify-end gap-8">
        <Button onClick={onClose}>{t("Cancel")}</Button>
        <Button primary onClick={handleClick}>
          {t("Reset")}
        </Button>
      </div>
    </ModalDialog>
  )
}

type DeactivateMode = "all" | "unused"

const DeactivateNetworksModalContent: FC<{
  platform: PlatformOption
  onClose: () => void
}> = ({ platform, onClose }) => {
  const { t } = useTranslation()
  const isBalancesInitializing = useIsBalanceInitializing()
  const balances = useBalances("all")
  const networks = useNetworks({ activeOnly: true, includeTestnets: true, platform })

  const [activeNetworkIds, unusedNetworkIds] = useMemo(() => {
    const networkIds = networks.map((network) => network.id)

    return [
      networkIds,
      networkIds.filter((networkId) => !balances.find({ networkId }).sum.planck.total),
    ]
  }, [networks, balances])

  const [mode, setMode] = useState<DeactivateMode>("all")

  const handleClick = useCallback(async () => {
    const networkIds = mode === "all" ? activeNetworkIds : unusedNetworkIds

    activeNetworksStore.mutate((prev) => ({
      ...prev,
      ...Object.fromEntries(networkIds.map((networkId) => [networkId, false])),
    }))

    onClose()
  }, [activeNetworkIds, mode, onClose, unusedNetworkIds])

  const disableSubmit = useMemo(() => {
    if (mode === "unused" && (isBalancesInitializing || !unusedNetworkIds.length)) return true
    if (mode === "all" && !activeNetworkIds.length) return true
    return false
  }, [activeNetworkIds.length, isBalancesInitializing, mode, unusedNetworkIds.length])

  return (
    <ModalDialog
      title={
        platform === "all"
          ? t("Deactivate networks")
          : t("Deactivate {{platform}} networks", { platform: startCase(platform) })
      }
      onClose={onClose}
    >
      <p className="text-body-secondary mb-8 text-sm">
        {t("It is recommended to deactivate unused networks to improve Talisman performance.")}
      </p>
      <div className="bg-grey-800 text-body-secondary flex h-28 w-full items-center gap-6 rounded-sm px-8 text-sm">
        {isBalancesInitializing ? (
          <>
            <LoaderIcon className="text-md shrink-0 animate-spin" />
            <div className="grow">
              {t("Scanning networks - found {{count}} unused", { count: unusedNetworkIds.length })}
            </div>
          </>
        ) : (
          <>
            <InfoIcon className="text-md shrink-0" />
            <div className="text-body-secondary grow">
              {t("Found {{count}} network(s) without token balances", {
                count: unusedNetworkIds.length,
              })}
            </div>
          </>
        )}
      </div>
      <div className="text-body-secondary flex flex-col items-start py-8 text-sm">
        <Radio
          name="deactivateMode"
          label={
            platform === "all"
              ? t("Deactivate all networks ({{count}})", { count: networks.length })
              : t("Deactivate all {{platform}} networks ({{count}})", {
                  platform: startCase(platform),
                  count: networks.length,
                })
          }
          value="all"
          checked={mode === "all"}
          onChange={() => setMode("all")}
        />
        <Radio
          name="deactivateMode"
          label={
            platform === "all"
              ? t("Deactivate all unused networks ({{count}})", {
                  count: unusedNetworkIds.length,
                })
              : t("Deactivate unused {{platform}} networks ({{count}})", {
                  platform: startCase(platform),
                  count: unusedNetworkIds.length,
                })
          }
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
