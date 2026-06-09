import { type DotNetworkId, subDTaoTokenId } from "@talismn/chaindata-provider"
import { isAddressEqual, isSs58Address } from "@talismn/crypto"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { SearchInputControlled } from "@ui/components/SearchInputControlled"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { useBittensorValidatorsMap } from "@ui/state/bittensor"
import { cn } from "@ui/util/cn"
import { type FC, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { useBittensorHotkeyExists } from "../hooks/useBittensorHotkeyExists"
import { type SubnetNeuron, useBittensorSubnetNeurons } from "../hooks/useBittensorSubnetNeurons"
import { HotkeyRowSkeleton, HotkeyRows } from "./HotkeyPickerRows"

const byStakeDesc = (a: SubnetNeuron, b: SubnetNeuron) =>
  b.stakeOnSubnet > a.stakeOnSubnet ? 1 : b.stakeOnSubnet < a.stakeOnSubnet ? -1 : 0

/**
 * Picks a conviction-lock target hotkey from every neuron on the subnet (validators, miners and the
 * owner hotkey), ordered by descending stake. A single field searches by name, hotkey or UID; when
 * the query is a full ss58 address it's resolved on-chain so a registered hotkey that isn't on this
 * subnet can still be picked.
 */
export const ConvictionLockHotkeyPicker: FC<{
  networkId: DotNetworkId
  netuid: number
  address: string | null
  hotkey: string | null
  onSelect: (hotkey: string) => void
}> = ({ networkId, netuid, address, hotkey, onSelect }) => {
  const { t } = useTranslation()
  const { neurons, isLoading, isError } = useBittensorSubnetNeurons(networkId, netuid, address)
  const { data: validatorsMap } = useBittensorValidatorsMap()

  const [rawSearch, setSearch] = useState("")
  const search = useDeferredValue(rawSearch)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const tokenId = useMemo(() => subDTaoTokenId(networkId, netuid), [networkId, netuid])
  const symbol = `SN${netuid}`

  const sortedNeurons = useMemo(() => [...neurons].sort(byStakeDesc), [neurons])

  const displayedNeurons = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return sortedNeurons
    return sortedNeurons.filter(
      (neuron) =>
        (neuron.name?.toLowerCase().includes(query) ?? false) ||
        neuron.hotkey.toLowerCase().includes(query) ||
        `${neuron.uid}`.includes(query)
    )
  }, [sortedNeurons, search])

  // when the query is a full ss58 address, resolve it on-chain so an off-subnet (but registered)
  // hotkey can still be selected; on-subnet hotkeys already surface through the substring filter
  const trimmedSearch = search.trim()
  const looksLikeAddress = isSs58Address(trimmedSearch)
  const { status: addressStatus, name: addressName } = useBittensorHotkeyExists(
    networkId,
    looksLikeAddress ? trimmedSearch : null
  )
  const offSubnetMatch = useMemo(
    () =>
      addressStatus === "exists" &&
      !neurons.some((neuron) => isAddressEqual(neuron.hotkey, trimmedSearch))
        ? trimmedSearch
        : null,
    [addressStatus, neurons, trimmedSearch]
  )
  // on-chain identity (IdentitiesV2) → global validator registry → null (falls back to short address)
  const offSubnetName = offSubnetMatch
    ? (addressName ?? validatorsMap[offSubnetMatch]?.name ?? null)
    : null

  // Reset scroll to top when the query changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll reset keys on the search value
  useEffect(() => {
    scrollContainerRef.current?.scrollTo(0, 0)
  }, [search])

  return (
    <div className="flex size-full flex-col gap-8 overflow-hidden">
      <div className="flex flex-col gap-2 px-12">
        <SearchInputControlled
          containerClassName={cn(
            "h-[2.25rem] shrink-0 grow rounded-sm border border-field bg-field! px-4! text-sm ring-transparent focus-within:border-grey-700",
            "[&>button>svg]:size-10 [&>input]:text-sm [&>svg]:size-8"
          )}
          placeholder={t("Search by name or address")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          autoFocus
        />
        {looksLikeAddress && addressStatus === "checking" && (
          <div className="px-2 text-body-disabled text-xs">{t("Checking…")}</div>
        )}
        {looksLikeAddress && addressStatus === "not-found" && (
          <div className="px-2 text-alert-warn text-xs">{t("This hotkey isn't registered")}</div>
        )}
      </div>

      <div className="flex w-full grow flex-col gap-2 overflow-hidden">
        <ScrollContainer
          ref={scrollContainerRef}
          className="w-full grow"
          innerClassName="flex flex-col w-full bg-black-secondary"
        >
          {offSubnetMatch && (
            <button
              type="button"
              onClick={() => onSelect(offSubnetMatch)}
              className={cn(
                "flex h-14.5 w-full shrink-0 items-center gap-6 overflow-hidden px-12 pl-8 text-left hover:bg-grey-750",
                offSubnetMatch === hotkey && "bg-grey-800 text-body-secondary"
              )}
            >
              <AccountIcon address={offSubnetMatch} className="size-16 shrink-0 text-xl" />
              <div className="flex grow items-center justify-between gap-4 overflow-hidden text-body text-sm">
                {offSubnetName ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="truncate">{offSubnetName}</span>
                    </TooltipTrigger>
                    <TooltipContent>{offSubnetMatch}</TooltipContent>
                  </Tooltip>
                ) : (
                  <Address startCharCount={8} endCharCount={8} address={offSubnetMatch} />
                )}
                <span className="shrink-0 text-body-disabled text-xs">
                  {t("Not on this subnet")}
                </span>
              </div>
            </button>
          )}
          {isLoading && !neurons.length ? (
            Array(10)
              .fill(null)
              .map((_, i) => {
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                return <HotkeyRowSkeleton key={i} />
              })
          ) : (
            <HotkeyRows
              networkId={networkId}
              netuid={netuid}
              tokenId={tokenId}
              symbol={symbol}
              neurons={displayedNeurons}
              selectedHotkey={hotkey}
              onSelect={onSelect}
            />
          )}
          {isError && (
            <div className="flex h-full items-center justify-center text-alert-error">
              {t("Unable to fetch hotkeys")}
            </div>
          )}
        </ScrollContainer>
      </div>
    </div>
  )
}
