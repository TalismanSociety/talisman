import { Chain, isCustomChain } from "@talismn/chaindata-provider"
import { ChevronRightIcon, InfoIcon, LoaderIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import sortBy from "lodash/sortBy"
import { ChangeEventHandler, FC, Suspense, useCallback, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useIntersection } from "react-use"
import { Button, ListButton, Modal, ModalDialog, Radio, Toggle, useOpenClose } from "talisman-ui"

import { activeChainsStore, isChainActive } from "@extension/core"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { sendAnalyticsEvent } from "@ui/api/analytics"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import {
  useActiveChainsState,
  useBalances,
  useChains,
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
  const chains = useChains({ activeOnly: true, includeTestnets })

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

export const ChainsList = ({ search }: { search?: string }) => {
  const { t } = useTranslation("admin")
  const [useTestnets] = useSetting("useTestnets")
  const allChains = useChains()
  const networksActiveState = useActiveChainsState()
  const chains = useMemo(
    () => (useTestnets ? allChains : allChains.filter((n) => !n.isTestnet)),
    [allChains, useTestnets],
  )

  const [filteredChains, exactMatches] = useMemo(() => {
    if (search === undefined || search.length < 1) return [chains, [] as string[]] as const
    const lowerSearch = search.toLowerCase()

    const filter = (chain: Chain) =>
      chain.name?.toLowerCase().includes(lowerSearch) ||
      chain.nativeToken?.id.toLowerCase().includes(lowerSearch)

    const filtered = chains.filter(filter)
    const exactMatches = filtered.flatMap((chain) =>
      lowerSearch.trim() === chain.name?.toLowerCase().trim() ||
      lowerSearch.trim() === chain.nativeToken?.id.toLowerCase().trim()
        ? [chain.id]
        : [],
    )

    return [filtered, exactMatches] as const
  }, [chains, search])

  const sortedChains = useMemo(() => {
    const byName = sortBy(filteredChains, "name")
    if (exactMatches.length < 1) return byName

    // put exact matches at the top of the list
    return byName.sort((a, b) => {
      const aExactMatch = exactMatches.includes(a.id)
      const bExactMatch = exactMatches.includes(b.id)
      if (aExactMatch && !bExactMatch) return -1
      if (bExactMatch && !aExactMatch) return 1
      return 0
    })
  }, [exactMatches, filteredChains])

  const handleNetworkActiveChanged = useCallback(
    (network: Chain) => (enable: boolean) => {
      activeChainsStore.setActive(network.id, enable)
    },
    [],
  )

  const activateAll = useCallback(
    (activate = false) =>
      () => {
        activeChainsStore.set(Object.fromEntries(filteredChains.map((n) => [n.id, activate])))
      },
    [filteredChains],
  )

  const ocDeactivateAllModal = useOpenClose()

  if (!sortedChains) return null

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

        <Suspense fallback={<SuspenseTracker name="DeactivateAllModal" />}>
          <Modal isOpen={ocDeactivateAllModal.isOpen} onDismiss={ocDeactivateAllModal.close}>
            <DeactivateNetworksModalContent onClose={ocDeactivateAllModal.close} />
          </Modal>
        </Suspense>
      </div>
      {sortedChains.map((chain) => (
        <ChainsListItem
          key={chain.id}
          chain={chain}
          isActive={isChainActive(chain, networksActiveState)}
          onEnableChanged={handleNetworkActiveChanged(chain)}
        />
      ))}
    </div>
  )
}

const ChainsListItem = ({
  chain,
  isActive,
  onEnableChanged,
}: {
  chain: Chain
  isActive: boolean
  onEnableChanged: (enable: boolean) => void
}) => {
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

  // there are lots of chains so we should only render visible rows to prevent performance issues
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
    </>
  ) : null

  return (
    <div ref={refContainer} className="relative h-28">
      {rowContent}
    </div>
  )
}
