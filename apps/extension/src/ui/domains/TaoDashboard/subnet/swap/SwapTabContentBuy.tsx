import { subDTaoTokenId, subNativeTokenId } from "@talismn/chaindata-provider"
import { type FC, useMemo } from "react"
import { Button } from "talisman-ui"
import { BITTENSOR_NETWORK_ID } from "../../subnets/constants"
import { SwapBuyInput } from "./SwapBuyInput"

export const SwapTabContentBuy: FC<{ netuid: number }> = ({ netuid }) => {
  const fromTokenId = useMemo(() => {
    return subNativeTokenId(BITTENSOR_NETWORK_ID)
  }, [])

  const _toTokenId = useMemo(() => {
    return subDTaoTokenId(BITTENSOR_NETWORK_ID, netuid)
  }, [netuid])

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <SwapBuyInput
        account=""
        tokenId={fromTokenId}
        amount={0n}
        maxAmount={0n}
        onAccountChange={() => {}}
        onAmountChange={() => {}}
        onTokenChange={() => {}}
      />

      <Button className="bg-buy">Test Buy Button</Button>
    </div>
  )
}
