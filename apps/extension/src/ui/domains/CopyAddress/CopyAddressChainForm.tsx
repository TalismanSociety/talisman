import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { ChevronRightIcon, CopyIcon } from "@talisman/theme/icons"
import { convertAddress } from "@talisman/util/convertAddress"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { Chain, ChainId } from "@talismn/chaindata-provider"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import useChains from "@ui/hooks/useChains"
import { useSettings } from "@ui/hooks/useSettings"
import sortBy from "lodash/sortBy"
import { useCallback, useMemo, useState } from "react"

import AccountAvatar from "../Account/Avatar"
import { ChainLogo } from "../Asset/ChainLogo"
import { CopyAddressLayout } from "./CopyAddressLayout"
import { useCopyAddressWizard } from "./useCopyAddressWizard"

type ChainFormat = {
  key: string
  chainId: ChainId | null
  prefix: number | null
  name: string
  address: string
}

const SUBSTRATE_FORMAT: Omit<ChainFormat, "address"> = {
  key: "substrate",
  chainId: null,
  prefix: null,
  name: "Substrate (Generic)",
}

const ChainFormatButton = ({ format, onClick }: { format: ChainFormat; onClick?: () => void }) => {
  return (
    <button
      onClick={onClick}
      className="text-body-secondary hover:text-body hover:bg-grey-800 flex h-32 w-full items-center gap-4 px-8"
    >
      {format.chainId ? (
        <ChainLogo className="shrink-0 text-xl" id={format.chainId} />
      ) : (
        <AccountAvatar
          className="shrink-0 text-xl "
          address={format.address}
          type="polkadot-identicon"
        />
      )}
      <div className="flex grow flex-col gap-2 text-left">
        <div className="text-body">{format.name}</div>
        <div className="text-body-secondary text-sm">{shortenAddress(format.address, 5, 5)}</div>
      </div>
      <ChevronRightIcon className="text-lg" />
    </button>
  )
}

const ChainFormatsList = ({
  formats,
  onSelect,
}: {
  formats: ChainFormat[]
  onSelect?: (chainId: ChainId | null) => void
}) => {
  const handleSelect = useCallback(
    (chainId: ChainId | null) => () => {
      onSelect?.(chainId)
    },
    [onSelect]
  )

  return (
    <div className="flex flex-col">
      {formats.map((format) => (
        <ChainFormatButton
          key={format.key}
          format={format}
          onClick={handleSelect(format.chainId)}
        />
      ))}
    </div>
  )
}

export const CopyAddressChainForm = () => {
  const { address, setChainId } = useCopyAddressWizard()
  const [search, setSearch] = useState("")
  const { useTestnets = false } = useSettings()
  const { chains, chainsMap } = useChains(useTestnets)

  const account = useAccountByAddress(address)
  const accountChain = useMemo(
    () => account?.genesisHash && chains.find((c) => account?.genesisHash === c.genesisHash),
    [account?.genesisHash, chains]
  )

  const formats: ChainFormat[] = useMemo(() => {
    if (!address || !chains.length) return []

    const sortedChains = [
      chainsMap["polkadot"],
      chainsMap["kusama"],
      ...sortBy(
        chains.filter(
          (c) =>
            typeof c.prefix === "number" &&
            c.account !== "ethereum" &&
            !["polkadot", "kusama"].includes(c.id)
        ),
        "name"
      ),
    ].filter(Boolean) as Chain[]

    return [
      { ...SUBSTRATE_FORMAT, address: convertAddress(address, null) },
      ...sortedChains.map<ChainFormat>((chain) => ({
        key: chain.id,
        chainId: chain.id,
        prefix: chain.prefix,
        name: chain.name ?? "unknown",
        address: convertAddress(address, chain.prefix),
      })),
    ].filter((f) => !accountChain || accountChain.id === f.chainId)
  }, [address, chains, chainsMap, accountChain])

  const filteredFormats = useMemo(() => {
    if (!search) return formats
    const lowerSearch = search.toLocaleLowerCase()
    return formats.filter((format) => format.name.toLowerCase().includes(lowerSearch))
  }, [formats, search])

  return (
    <CopyAddressLayout title="Select network">
      <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <SearchInput onChange={setSearch} placeholder="Search by network name" autoFocus />
        </div>
        <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
          <ChainFormatsList formats={filteredFormats} onSelect={setChainId} />
        </ScrollContainer>
      </div>
    </CopyAddressLayout>
  )
}
