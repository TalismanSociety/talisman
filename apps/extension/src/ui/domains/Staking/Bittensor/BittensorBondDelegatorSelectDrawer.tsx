import { FC, useState } from "react"

import { BondOption, BondSelectDrawer, SortMethod } from "../shared/BondSelectDrawer"

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

  const handleSubmitPoolId = () => {
    // console.log("implement selecting pool id ", selectedPoolId)
    if (selectedPoolId && setPoolId) setPoolId(selectedPoolId)
  }

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
      bondOptions={mockedBondOption}
      tokenSymbol="TAO"
      selectedPoolId={selectedPoolId}
    />
  )
}

const mockedBondOption: BondOption[] = [
  {
    poolId: 1,
    name: "Ethereum Staking Pool",
    apr: 5.2,
    totalStaked: 1000000,
    totalStakers: 2500,
  },
  {
    poolId: "5F4tQyWrhfGVcNhoqeiNsR6KjD4wMZ2kfhLj4oHYuyHbZAc3",
    name: "Bitcoin Staking Pool",
    apr: 4.8,
    totalStaked: 750000,
    totalStakers: 1800,
  },
  {
    poolId: 3,
    name: "Polkadot Staking Pool",
    apr: 6.5,
    totalStaked: 500000,
    totalStakers: 1200,
  },
  {
    poolId: 4,
    name: "Cardano Staking Pool",
    apr: 3.9,
    totalStaked: 850000,
    totalStakers: 2100,
  },
  {
    poolId: 5,
    name: "Solana Staking Pool",
    apr: 7.1,
    totalStaked: 600000,
    totalStakers: 1600,
  },
  {
    poolId: 6,
    name: "Avalanche Staking Pool",
    apr: 5.6,
    totalStaked: 300000,
    totalStakers: 900,
  },
  {
    poolId: 7,
    name: "Binance Coin Staking Pool",
    apr: 6.3,
    totalStaked: 950000,
    totalStakers: 2300,
  },
  {
    poolId: 8,
    name: "Polygon Staking Pool",
    apr: 4.5,
    totalStaked: 400000,
    totalStakers: 1300,
  },
  {
    poolId: 9,
    name: "Cosmos Staking Pool",
    apr: 5.9,
    totalStaked: 550000,
    totalStakers: 1700,
  },
  {
    poolId: 10,
    name: "Tezos Staking Pool",
    apr: 4.1,
    totalStaked: 650000,
    totalStakers: 1900,
  },
]
