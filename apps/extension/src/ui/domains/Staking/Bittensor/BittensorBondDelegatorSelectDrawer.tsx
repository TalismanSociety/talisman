import { FC, useCallback, useEffect, useState } from "react"
import { useOpenClose } from "talisman-ui"

import { BondOption } from "../hooks/bittensor/types"
import { useCombinedBittensorValidatorsData } from "../hooks/bittensor/useCombinedBittensorValidatorsData"
import { BondSelectDrawer, SortMethod } from "../shared/BondSelectDrawer"

type BittensorBondDelegatorSelectDrawerProps = {
  poolName: string
  poolId: number | string | null | undefined
  setPoolId?: (poolId: number | string) => void
}

const sortMethods: SortMethod[] = [
  { label: "Name", value: "name" },
  { label: "Total Staked", value: "totalStaked" },
  { label: "N° of Stakers", value: "totalStakers" },
  { label: "Rewards", value: "apy" },
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

  useEffect(() => {
    if (combinedValidatorsData.length && !combinedValidatorsDataLoading) {
      setSortedDelegators(combinedValidatorsData)
    }
  }, [combinedValidatorsData, combinedValidatorsDataLoading])

  const handleSubmitPoolId = useCallback(() => {
    if (selectedPoolId && setPoolId) setPoolId(selectedPoolId)
  }, [selectedPoolId, setPoolId])

  const handleSortMethodChange = (method: SortMethod) => {
    setSelectedSortMethod(method)
    // console.log("implement sorting by ", method.value)
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
