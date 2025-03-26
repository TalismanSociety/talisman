import { useCallback, useEffect, useState } from "react"

import { BondOption } from "../hooks/bittensor/types"
import { useCombinedBittensorValidatorsData } from "../hooks/bittensor/useCombinedBittensorValidatorsData"
import { BondDelegateSelect } from "../shared/BondDelegateSelect"

type SortValue = "name" | "totalStaked" | "totalStakers" | "apr"

export type SortMethod = {
  label: string
  value: SortValue
}

const sortMethods: SortMethod[] = [
  { label: "Total Staked", value: "totalStaked" },
  { label: "Name", value: "name" },
  { label: "N° of Stakers", value: "totalStakers" },
  { label: "Rewards", value: "apr" },
]

export const BittensorBondDelegateSelect = () => {
  const [selectedSortMethod, setSelectedSortMethod] = useState<SortMethod>(sortMethods[0])
  const [sortedDelegators, setSortedDelegators] = useState<BondOption[]>([])

  const {
    combinedValidatorsData,
    isLoading: combinedValidatorsDataLoading,
    isSupportedValidatorsError,
  } = useCombinedBittensorValidatorsData()

  const sortBondOptions = useCallback((data: BondOption[], sortBy: SortValue): BondOption[] => {
    const sorted = data.sort((a, b) => {
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

    return sorted
  }, [])

  useEffect(() => {
    if (
      combinedValidatorsData.length &&
      !combinedValidatorsDataLoading &&
      !sortedDelegators.length
    ) {
      setSortedDelegators(sortBondOptions(combinedValidatorsData, "name"))
    }
  }, [
    combinedValidatorsData,
    combinedValidatorsDataLoading,
    sortBondOptions,
    sortedDelegators.length,
  ])

  const handleSortMethodChange = (method: SortMethod) => {
    setSelectedSortMethod(method)
    setSortedDelegators((prev) => sortBondOptions(prev, method.value))
  }

  return (
    <BondDelegateSelect
      sortMethods={sortMethods}
      selectedSortMethod={selectedSortMethod}
      handleSortMethodChange={handleSortMethodChange}
      isLoading={combinedValidatorsDataLoading && !sortedDelegators.length}
      bondOptions={sortedDelegators}
      tokenId="bittensor-substrate-native"
      isError={isSupportedValidatorsError}
    />
  )
}
