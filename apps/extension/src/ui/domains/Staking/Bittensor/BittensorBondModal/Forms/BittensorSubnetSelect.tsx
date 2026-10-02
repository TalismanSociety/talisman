import { track } from "@ui/api/track"
import { SearchInputControlled } from "@ui/components/SearchInputControlled"
import { useCombinedSubnetData } from "@ui/domains/Staking/Bittensor/hooks/dTao/useCombinedSubnetData"
import { cn } from "@ui/util/cn"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { BittensorModalLayout } from "../../components/BittensorModalLayout"
import { BittensorStakingModalHeader } from "../../components/BittensorStakingModalHeader"
import {
  SubnetList,
  SubnetSortButton,
  type SubnetSortValue,
  useDisplayedSubnets,
} from "../../components/SubnetList"
import { useBittensorBondModal } from "../../hooks/useBittensorBondModal"
import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import { ROOT_NETUID } from "../../utils/constants"

export const BittensorSubnetSelect = () => {
  const { t } = useTranslation()
  const { setStep, setNetuid, netuid, networkId } = useBittensorBondWizard()
  const { close } = useBittensorBondModal()
  const [sortMethod, setSortMethod] = useState<SubnetSortValue>("netuid") // netuid doesnt cause flickering
  const [search, setSearch] = useState<string>("")

  const { subnetData, isLoading } = useCombinedSubnetData(networkId)
  const { displayedSubnets, deferredSearch } = useDisplayedSubnets(
    subnetData,
    sortMethod,
    search,
    true
  )

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleSubmit = useCallback(
    (netuid: number) => {
      track("staking_subnet_selected", { netuid, is_root: netuid === ROOT_NETUID })
      setNetuid(netuid)
      setStep("form")
    },
    [setNetuid, setStep]
  )

  // Reset scroll to top when sort method or search changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  useEffect(() => {
    scrollContainerRef.current?.scrollTo(0, 0)
  }, [sortMethod, deferredSearch])

  return (
    <BittensorModalLayout
      header={
        <BittensorStakingModalHeader
          title={t("Select Subnet")}
          onBackClick={() => (netuid === null ? close() : setStep("form"))}
          onCloseModal={close}
          withClose
        />
      }
    >
      <div className="flex size-full flex-col gap-8 overflow-hidden">
        <div className="flex items-center gap-4 px-12">
          <div className="grow">
            <SearchInputControlled
              containerClassName={cn(
                "h-[2.25rem] shrink-0 grow rounded-sm border border-field bg-field! px-4! text-sm ring-transparent focus-within:border-grey-700",
                "[&>button>svg]:size-10 [&>input]:text-sm [&>svg]:size-8"
              )}
              placeholder={t("Search subnets")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              autoFocus
            />
          </div>
          <SubnetSortButton method={sortMethod} onChange={setSortMethod} />
        </div>
        <SubnetList
          networkId={networkId}
          subnets={displayedSubnets}
          selectedNetuid={netuid}
          isLoading={isLoading}
          onSelect={handleSubmit}
          scrollContainerRef={scrollContainerRef}
        />
      </div>
    </BittensorModalLayout>
  )
}
