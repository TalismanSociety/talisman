import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react"
import { isNetworkDot } from "@talismn/chaindata-provider"
import { AccountPlatform } from "@talismn/crypto"
import { ChevronDownIcon, ChevronUpIcon, CloseIcon, SearchIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { isNetworkActive } from "extension-core"
import { startCase } from "lodash-es"
import { useCallback, useId, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { useActiveNetworksState, useNetworks, useNetworksMapById, useTokensMap } from "@ui/state"
import { useNetworkDisplayNamesMapById, useNetworkDisplayTypesMapById } from "@ui/state/networks"

const DEFAULT_COMBO_BOX_HEADER_ID = "combobox-header"

export function AccountTypeNetworkSearch({
  setAccountPlatform,
}: {
  setAccountPlatform: (accountType?: AccountPlatform) => void
}) {
  const { t } = useTranslation()

  const inputId = useId()

  const [search, setSearch] = useState("")

  const tokensMap = useTokensMap()
  const activeNetworkStates = useActiveNetworksState()
  const allNetworksAggregated = useNetworks()
  const allNetworksMap = useNetworksMapById()
  const networkNameById = useNetworkDisplayNamesMapById()
  const networkTypeById = useNetworkDisplayTypesMapById()

  const allNetworkItems = useMemo(
    () =>
      allNetworksAggregated
        .map((network) => {
          const name = network.name
          const label = networkNameById[network.id] ?? network.name
          const type = networkTypeById[network.id] ?? network.platform
          const symbol = tokensMap[network.nativeTokenId]?.symbol
          const isActive = isNetworkActive(network, activeNetworkStates)
          const account = isNetworkDot(network) ? network.account : undefined
          return { id: network.id, name, label, type, symbol, account, isActive }
        })
        .sort((a, b) => {
          // First sort by isActive (true values first)
          if (a.isActive !== b.isActive) {
            return a.isActive ? -1 : 1
          }
          // Then sort alphabetically by label
          return a.label?.localeCompare(b.label ?? "") ?? 0
        }),

    [allNetworksAggregated, networkNameById, networkTypeById, tokensMap, activeNetworkStates],
  )
  type Network = (typeof filteredNetworkItems)[number]

  const filteredNetworkItems = useMemo(() => {
    if (!search) return allNetworkItems
    return allNetworkItems.filter(
      (network) =>
        network.label?.toLowerCase().includes(search.toLowerCase().trim()) ||
        network.symbol?.toLowerCase().includes(search.toLowerCase().trim()),
    )
  }, [allNetworkItems, search])

  const [selected, setSelected] = useState<Network | null>(null)

  const handleChange = useCallback(
    (option: Network | null) => {
      setSelected(option)
      setSearch("")

      if (!option || option.id === DEFAULT_COMBO_BOX_HEADER_ID) return setAccountPlatform()

      setAccountPlatform(getAccountPlatform(allNetworksMap[option.id]))
    },
    [allNetworksMap, setAccountPlatform],
  )

  const networksWithHeader = useMemo(
    () => [
      {
        id: "combobox-header",
        name: "",
        label: "",
        type: "",
        symbol: "",
        account: undefined,
        isActive: false,
      },
      ...filteredNetworkItems,
    ],
    [filteredNetworkItems],
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
              <NetworkLogo networkId={selected.id} className="text-md" />
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
                  <NetworkLogo networkId={network.id} className="text-md" />
                  <span className="text-white">{network.name}</span>
                  <span className="text-body-secondary/50 text-base">{network.type}</span>
                  <div className="flex-grow" />
                  <span className="text-white">{startCase(getAccountPlatform(network))}</span>
                </ComboboxOption>
              )
            }
          </ComboboxOptions>
        </div>
      )}
    </Combobox>
  )
}

function getAccountPlatform<T extends { id: string } | { id: string; account?: string }>(
  network: T,
) {
  if ("account" in network && network.account !== "secp256k1") return "polkadot"
  if ("account" in network && network.account === "secp256k1") return "ethereum"
  if (!("account" in network)) return "ethereum"

  throw new Error(`Unhandled network ${network}`)
}
