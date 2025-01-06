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
import { isChainActive, isEvmNetworkActive } from "extension-core"
import startCase from "lodash/startCase"
import { useCallback, useId, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { getNetworkInfo } from "@ui/hooks/useNetworkInfo"
import {
  useActiveChainsState,
  useActiveEvmNetworksState,
  useChainsMap,
  useEvmNetworksMap,
  useTokensMap,
} from "@ui/state"

const DEFAULT_COMBO_BOX_HEADER_ID = "combobox-header"

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
  const activeEvmNetworks = useActiveEvmNetworksState()
  const activePolkadotNetworks = useActiveChainsState()

  const allNetworks = useMemo(
    () =>
      [
        ...Object.values(chainsMap).flatMap((chain) => {
          if (chain.isTestnet) return []
          const relay = chain.relay?.id ? chainsMap[chain.relay.id] : null
          const { label, type } = getNetworkInfo(t, { chain, relay })
          const symbol = tokensMap[chain.nativeToken?.id ?? ""]?.symbol
          const isActive = isChainActive(chain, activePolkadotNetworks)

          return { id: chain.id, label, type, symbol, account: chain.account, isActive }
        }),
        ...Object.values(evmNetworksMap).flatMap((evmNetwork) => {
          if (evmNetwork.isTestnet) return []
          const { label, type } = getNetworkInfo(t, { evmNetwork })
          const symbol = tokensMap[evmNetwork.nativeToken?.id ?? ""]?.symbol
          const isActive = isEvmNetworkActive(evmNetwork, activeEvmNetworks)
          return { id: evmNetwork.id, label, type, symbol, isActive }
        }),
      ].sort((a, b) => {
        // First sort by isActive (true values first)
        if (a.isActive !== b.isActive) {
          return a.isActive ? -1 : 1
        }
        // Then sort alphabetically by label
        return a.label?.localeCompare(b.label ?? "") ?? 0
      }),

    [t, chainsMap, evmNetworksMap, tokensMap, activeEvmNetworks, activePolkadotNetworks],
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

  const handleChange = useCallback(
    (option: Network | null) => {
      setSelected(option)
      setSearch("")

      if (!option || option.id === DEFAULT_COMBO_BOX_HEADER_ID) return setAccountType()

      const network: Chain | SimpleEvmNetwork | undefined =
        chainsMap[option.id] ?? evmNetworksMap[option.id] ?? undefined
      setAccountType(getAccountType(network))
    },
    [chainsMap, evmNetworksMap, setAccountType],
  )

  const networksWithHeader = useMemo(
    () => [
      { id: "combobox-header", label: null, type: "", symbol: "", isActive: false },
      ...networks,
    ],
    [networks],
  )

  return (
    <Combobox
      className="relative col-span-2 w-full cursor-text"
      as="label"
      spellCheck={false}
      htmlFor={inputId}
      virtual={{ options: networksWithHeader }}
      immediate
      value={selected}
      onChange={handleChange}
      onClick={selected ? () => setSelected(null) : undefined}
    >
      {({ open }) => (
        <div
          className={classNames(
            "bg-grey-850 text-body-secondary/50 flex h-24 w-full items-center gap-4 rounded-sm px-8 text-sm",
            open && "rounded-b-none",
          )}
        >
          <SearchIcon className="shrink-0 text-base" />
          {selected && selected.id !== DEFAULT_COMBO_BOX_HEADER_ID && (
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
          <ComboboxOptions className="bg-grey-850 absolute left-0 top-24 z-10 h-[30rem] w-full overflow-scroll rounded-b">
            {({ option: network }) =>
              network.id === "combobox-header" ? (
                <ComboboxOption
                  key={network.id}
                  className="flex h-24 w-full items-center justify-between gap-4 px-8 text-base"
                  value={network}
                  disabled
                >
                  <div>{t("Network")}</div>
                  <div>{t("Account Type")}</div>
                </ComboboxOption>
              ) : (
                <ComboboxOption
                  key={network.id}
                  className="hover:bg-grey-800 focus:bg-grey-800 data-[focus]:bg-grey-800 flex h-24 w-full cursor-pointer items-center gap-4 px-8 text-base"
                  value={network}
                >
                  <ChainLogo id={network.id} className="text-md" />
                  <span className="text-white">{network.label}</span>
                  <span className="text-body-secondary/50 text-base">{network.type}</span>
                  <div className="flex-grow" />
                  <span className="text-white">{startCase(getAccountType(network))}</span>
                </ComboboxOption>
              )
            }
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
