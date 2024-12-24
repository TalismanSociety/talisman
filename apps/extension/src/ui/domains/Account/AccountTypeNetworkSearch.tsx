import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react"
import { Chain, SimpleEvmNetwork } from "@talismn/chaindata-provider"
import { ChevronDownIcon, ChevronUpIcon, CloseIcon, SearchIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useVirtualizer } from "@tanstack/react-virtual"
import startCase from "lodash/startCase"
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { getNetworkInfo } from "@ui/hooks/useNetworkInfo"
import { useChainsMap, useEvmNetworksMap, useTokensMap } from "@ui/state"

export function AccountTypeNetworkSearch({
  setAccountType,
}: {
  setAccountType: (accountType?: string) => void
}) {
  const { t } = useTranslation()

  const inputId = useId()

  const [search, setSearch] = useState("")

  const chainsMap = useChainsMap()
  const evmNetworksMap = useEvmNetworksMap()
  const tokensMap = useTokensMap()
  const allNetworks = useMemo(
    () =>
      [
        ...Object.values(chainsMap).flatMap((chain) => {
          if (chain.isTestnet) return []
          const relay = chain.relay?.id ? chainsMap[chain.relay.id] : null
          const { label, type } = getNetworkInfo(t, { chain, relay })
          const symbol = tokensMap[chain.nativeToken?.id ?? ""]?.symbol

          return { id: chain.id, label, type, symbol, account: chain.account }
        }),
        ...Object.values(evmNetworksMap).flatMap((evmNetwork) => {
          if (evmNetwork.isTestnet) return []
          const { label, type } = getNetworkInfo(t, { evmNetwork })
          const symbol = tokensMap[evmNetwork.nativeToken?.id ?? ""]?.symbol

          return { id: evmNetwork.id, label, type, symbol }
        }),
      ].sort((a, b) => a.label?.localeCompare(b.label ?? "") ?? 0),

    [t, chainsMap, evmNetworksMap, tokensMap],
  )
  type Network = (typeof networks)[number]

  const networks = useMemo(() => {
    if (!search) return allNetworks
    return allNetworks.filter(
      (network) =>
        network.label?.toLowerCase().includes(search.toLowerCase().trim()) ||
        network.symbol?.toLowerCase().includes(search.toLowerCase().trim()),
    )
  }, [allNetworks, search])

  const [selected, setSelected] = useState<Network | null>(null)
  useEffect(() => {
    if (!selected) return setAccountType()

    const network: Chain | SimpleEvmNetwork | undefined =
      chainsMap[selected.id] ?? evmNetworksMap[selected.id] ?? undefined
    setAccountType(getAccountType(network))
  }, [chainsMap, evmNetworksMap, selected, setAccountType])

  const refContainer = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: networks.length,
    estimateSize: () => 40,
    overscan: 5,
    getScrollElement: () => refContainer.current,
  })

  const Recalculate = useMemo(
    () =>
      function Recalculate({ open }: { open: boolean }) {
        useLayoutEffect(() => {
          if (!open) return
          virtualizer.measure()
        }, [open])
        return null
      },
    [virtualizer],
  )
  const ClearSearch = useMemo(
    () =>
      function ClearSearch({ open }: { open: boolean }) {
        useEffect(() => {
          if (open) return
          setSearch("")
        }, [open])
        return null
      },
    [setSearch],
  )

  return (
    <Combobox
      className="relative col-span-2 flex w-full cursor-text flex-col justify-start gap-4"
      as="label"
      htmlFor={inputId}
      immediate
      value={selected}
      onChange={setSelected}
      onClick={selected ? () => setSelected(null) : undefined}
    >
      {({ open }) => (
        <div
          className={classNames(
            "bg-grey-850 text-body-secondary/50 col-span-2 flex w-full items-center justify-start gap-4 rounded-sm p-8 text-sm",
            open && "rounded-b-none",
          )}
        >
          <Recalculate open={open} />
          <ClearSearch open={open} />

          <SearchIcon className="shrink-0 text-base" />
          {selected && (
            <div className="flex items-center gap-4">
              <ChainLogo id={selected.id} className="text-md" />
              <span className="text-base text-white">{selected.label}</span>
            </div>
          )}
          <ComboboxInput
            className={classNames("w-full border-none bg-transparent", selected && "hidden")}
            id={inputId}
            placeholder={t("Search for network")}
            onChange={(e) => setSearch(e.target.value)}
            value={search}
            autoComplete="off"
          />
          <div className="flex-grow" />
          <ComboboxButton>
            {!open && !selected && <ChevronDownIcon className="cursor-pointer text-base" />}
            {open && <ChevronUpIcon className="cursor-pointer text-base" />}
          </ComboboxButton>
          {selected && (
            <CloseIcon className="cursor-pointer text-base" onClick={() => setSelected(null)} />
          )}
          <ComboboxOptions className="bg-grey-850 absolute bottom-0 left-0 z-10 flex w-full translate-y-full flex-col gap-4 overflow-hidden rounded-b">
            <div className="flex items-center justify-between gap-4 px-8">
              <div>{t("Network")}</div>
              <div>{t("Account Type")}</div>
            </div>
            <div ref={refContainer} className="max-h-[30rem] overflow-scroll">
              <div
                className="relative w-full"
                style={{ height: `${virtualizer.getTotalSize()}px` }}
              >
                {virtualizer.getVirtualItems().map((item) => {
                  const network = networks[item.index]
                  return (
                    <ComboboxOption
                      key={item.key}
                      className="hover:bg-grey-800 focus:bg-grey-800 data-[focus]:bg-grey-800 absolute left-0 top-0 flex w-full cursor-pointer items-center gap-4 px-8 text-base"
                      value={network}
                      style={{
                        height: `${item.size}px`,
                        transform: `translateY(${item.start}px)`,
                      }}
                    >
                      <ChainLogo id={network.id} className="text-md" />
                      <span className="text-white">{network.label}</span>
                      <span className="text-body-secondary/50 text-base">{network.type}</span>
                      <div className="flex-grow" />
                      <span className="text-white">{startCase(getAccountType(network))}</span>
                    </ComboboxOption>
                  )
                })}
              </div>
            </div>
          </ComboboxOptions>
        </div>
      )}
    </Combobox>
  )
}

function getAccountType<T extends { id: string } | { id: string; account?: string }>(network: T) {
  if ("account" in network && network.account !== "secp256k1") return "polkadot"
  if ("account" in network && network.account === "secp256k1") return "ethereum"
  if (!("account" in network)) return "ethereum"

  throw new Error(`Unhandled network ${network}`)
}
