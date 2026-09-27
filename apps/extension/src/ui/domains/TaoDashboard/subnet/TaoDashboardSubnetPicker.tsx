import type { NetworkId } from "@talismn/chaindata-provider"
import { SearchInput } from "@ui/components/SearchInput"
import {
  SubnetList,
  SubnetSortButton,
  type SubnetSortValue,
  useDisplayedSubnets,
} from "@ui/domains/Staking/Bittensor/components/SubnetList"
import { useCombinedSubnetData } from "@ui/domains/Staking/Bittensor/hooks/dTao/useCombinedSubnetData"
import { useOpenCloseStatus } from "@ui/hooks/useOpenCloseStatus"
import { cn } from "@ui/util/cn"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

export const SubnetPicker: React.FC<{
  networkId: NetworkId
  selected?: number
  onSelect: (netuid: number) => void
}> = ({ networkId, selected, onSelect }) => {
  const { t } = useTranslation()

  const [sortMethod, setSortMethod] = useState<SubnetSortValue>("netuid") // netuid doesnt cause flickering
  const [search, setSearch] = useState("")

  const { subnetData, isLoading, isSubnetsLoading } = useCombinedSubnetData(networkId)
  const { displayedSubnets } = useDisplayedSubnets(subnetData, sortMethod, search, false)

  const refInput = useRef<HTMLInputElement>(null)
  const status = useOpenCloseStatus()
  useEffect(() => {
    if (status === "open") refInput.current?.focus()
  }, [status])

  return (
    <div className="flex size-full flex-col gap-8 overflow-hidden">
      <div className="flex items-center gap-4 px-12">
        <div className="grow">
          <SearchInput
            ref={refInput}
            containerClassName={cn(
              "h-[2.25rem] shrink-0 grow rounded-sm border border-field bg-field! px-4! text-sm ring-transparent focus-within:border-grey-700",
              "[&>button>svg]:size-10 [&>input]:text-sm [&>svg]:size-8"
            )}
            placeholder={t("Search subnets")}
            onChange={setSearch}
            autoFocus
          />
        </div>
        <SubnetSortButton method={sortMethod} onChange={setSortMethod} />
      </div>
      <SubnetList
        networkId={networkId}
        subnets={displayedSubnets}
        selectedNetuid={selected}
        isLoading={isLoading || isSubnetsLoading}
        onSelect={onSelect}
      />
    </div>
  )
}
