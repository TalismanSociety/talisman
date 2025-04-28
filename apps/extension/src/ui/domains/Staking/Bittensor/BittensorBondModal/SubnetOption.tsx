import { classNames, planckToTokens } from "@talismn/util"

import { Tokens } from "@ui/domains/Asset/Tokens"
import { AssetPercentageChange } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/AssetPercentageChange"
import { type SubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/types"
import { useToken } from "@ui/state"

type SubnetOptionProps = {
  option: SubnetData
  selectedNetuid: number | null | undefined
  handleSelectSubnet: (subnetNetuid: number) => void
  tokenId: string
}

export const SubnetOption = ({
  option,
  selectedNetuid,
  handleSelectSubnet,
  tokenId,
}: SubnetOptionProps) => {
  const token = useToken(tokenId)
  const isSelected = option.netuid === selectedNetuid

  return (
    <button
      key={option.netuid}
      onClick={() => handleSelectSubnet(option.netuid!)}
      className={classNames(
        "bg-black-tertiary text-body-secondary border-black-tertiary flex w-full rounded-sm border-[1px] p-[12px] text-xs",
        isSelected && "border-grey-400 text-grey-300",
      )}
    >
      <div className="flex w-full flex-col gap-[10px]">
        <div className="flex w-full justify-between">
          <div className={classNames("self-end text-sm font-bold", isSelected && "text-white")}>
            {option.netuid} | {option.subnet_name} {option.symbol}
          </div>
          <AssetPercentageChange priceChange={option.price_change_1_day} />
        </div>
        <div className="flex w-full justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <Tokens
                amount={planckToTokens(option.total_tao, token?.decimals ?? 9)}
                symbol={token?.symbol}
              />
            </div>
            <div className="bg-body-disabled inline-block size-2 rounded-full" />

            <Tokens
              amount={planckToTokens(option.total_alpha, token?.decimals ?? 9)}
              symbol={option.symbol}
            />
          </div>
        </div>
      </div>
      {/* TODO: Add get subnets endpoint to calculate emissions */}
      {/* <div className="flex min-h-full items-center justify-center bg-red-500">123%</div> */}
    </button>
  )
}

export const SubnetOptionSkeleton = () => {
  return (
    <div className="bg-black-tertiary border-black-tertiary flex h-[6.7rem] w-full flex-col gap-[10px] rounded-sm border-[1px] p-[12px] text-xs">
      <div className="flex w-full justify-between">
        <div className="flex items-center" />
        <div className="bg-grey-700 rounded-xs h-[1.6rem] w-[15rem] animate-pulse" />
        <div className="bg-grey-700 rounded-xs ml-auto h-[1.6rem] w-[3rem] animate-pulse" />
      </div>
      <div className="bg-grey-700 rounded-xs h-[1.6rem] w-[15rem] animate-pulse" />
    </div>
  )
}
