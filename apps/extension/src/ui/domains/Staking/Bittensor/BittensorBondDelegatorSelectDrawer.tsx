import { FC, useCallback, useEffect, useState } from "react"
import { useOpenClose } from "talisman-ui"

import { BondOption } from "../hooks/bittensor/types"
import { useCombinedBittensorValidatorsData } from "../hooks/bittensor/useCombinedBittensorValidatorsData"
import { BondSelectDrawer } from "../shared/BondSelectDrawer"

type BittensorBondDelegatorSelectDrawerProps = {
  poolName: string
  poolId: number | string | null | undefined
  setPoolId?: (poolId: number | string) => void
}

type SortValue = "name" | "totalStaked" | "totalStakers" | "apr"

export type SortMethod = {
  label: string
  value: SortValue
}

const sortMethods: SortMethod[] = [
  { label: "Name", value: "name" },
  { label: "Total Staked", value: "totalStaked" },
  { label: "N° of Stakers", value: "totalStakers" },
  { label: "Rewards", value: "apr" },
]

export const BittensorBondDelegatorSelectDrawer: FC<BittensorBondDelegatorSelectDrawerProps> = ({
  poolName,
  poolId,
  setPoolId,
}) => {
  const [selectedSortMethod, setSelectedSortMethod] = useState<SortMethod>(sortMethods[0])
  const [selectedPoolId, setSelectedPoolId] = useState<number | string | null | undefined>(poolId)
  const [sortedDelegators, setSortedDelegators] = useState<BondOption[]>([])

  const { isOpen, toggle, close } = useOpenClose()

  const { combinedValidatorsData, isLoading: combinedValidatorsDataLoading } =
    useCombinedBittensorValidatorsData()

  const sortBondOptions = (data: BondOption[], sortBy: SortValue): BondOption[] => {
    return data.sort((a, b) => {
      if (sortBy === "name") {
        // Sort by name in ascending order (A to Z)
        if (a.name < b.name) return -1
        if (a.name > b.name) return 1
      } else {
        // Sort other fields in descending order
        if (a[sortBy] > b[sortBy]) return -1
        if (a[sortBy] < b[sortBy]) return 1
      }
      return 0 // Keep them in the same place if equal
    })
  }

  useEffect(() => {
    if (combinedValidatorsData.length && !combinedValidatorsDataLoading) {
      setSortedDelegators(sortBondOptions(combinedValidatorsData, "name"))
    }
  }, [combinedValidatorsData, combinedValidatorsDataLoading])

  const handleSubmitPoolId = useCallback(() => {
    if (selectedPoolId && setPoolId) setPoolId(selectedPoolId)
  }, [selectedPoolId, setPoolId])

  const handleSortMethodChange = (method: SortMethod) => {
    setSelectedSortMethod(method)
    setSortedDelegators((prev) => sortBondOptions(prev, method.value))
  }

  return (
    <BondSelectDrawer
      poolName={poolName}
      sortMethods={sortMethods}
      selectedSortMethod={selectedSortMethod}
      handleSortMethodChange={handleSortMethodChange}
      handleSelectPoolId={setSelectedPoolId}
      handleSubmitPoolId={handleSubmitPoolId}
      bondOptions={sortedDelegators}
      tokenSymbol="TAO"
      selectedPoolId={selectedPoolId}
      isOpen={isOpen}
      close={close}
      toggle={toggle}
      isLoading={combinedValidatorsDataLoading}
    />
  )
}
