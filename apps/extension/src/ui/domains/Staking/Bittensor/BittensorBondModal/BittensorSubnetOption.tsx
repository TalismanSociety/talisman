import { SCALE_FACTOR } from "@talismn/balances/src/modules/SubstrateNativeModule/util/subtensor"
import { classNames, planckToTokens } from "@talismn/util"

import { Tokens } from "@ui/domains/Asset/Tokens"
import { AssetPercentageChange } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/AssetPercentageChange"
import { type SubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/types"
import { useToken } from "@ui/state"

type BittensorSubnetOptionProps = {
  option: SubnetData
  selectedNetuid: number | null | undefined
  tokenId: string
  isSubnetsLoading: boolean
  isSubnetsError: boolean
  handleSelectSubnet: (subnetNetuid: number) => void
}

export const BittensorSubnetOption = ({
  option,
  selectedNetuid,
  tokenId,
  isSubnetsLoading,
  isSubnetsError,
  handleSelectSubnet,
}: BittensorSubnetOptionProps) => {
  const token = useToken(tokenId)
  const isSelected = option.netuid === selectedNetuid

  const formattedEmission =
    (Number(BigInt(option?.emission || 0) * 100n) / Number(SCALE_FACTOR)).toFixed(2) + "%"
  const emission = isSubnetsError ? "--" : formattedEmission

  return (
    <button
      key={option.netuid}
      onClick={() => handleSelectSubnet(option.netuid!)}
      className={classNames(
        "bg-black-tertiary text-body-secondary border-black-tertiary flex w-full items-stretch rounded-sm border-[1px] p-[12px] text-xs",
        isSelected && "border-grey-400 text-grey-300",
      )}
    >
      <div className="flex w-full flex-col gap-[10px]">
        <div className="flex w-full justify-between">
          <div
            className={classNames(
              "max-w-[22rem] self-end truncate text-sm font-bold",
              isSelected && "text-white",
            )}
          >
            {option.netuid} | {option.subnet_name} {option.symbol}
          </div>
          <AssetPercentageChange priceChange={option.price_change_1_day} />
        </div>
        <div className="flex w-full justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <Tokens
                amount={planckToTokens(option.total_tao, token?.decimals ?? token?.decimals)}
                symbol={token?.symbol}
              />
            </div>
            <div className="bg-body-disabled inline-block size-2 rounded-full" />

            <Tokens
              amount={planckToTokens(option.total_alpha, token?.decimals ?? token?.decimals)}
              symbol={option.symbol}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center pl-[0.75rem] text-sm">
        {isSubnetsLoading ? (
          <div className="bg-grey-700 rounded-xs h-[1.6rem] w-[3.5rem] animate-pulse" />
        ) : (
          emission
        )}
      </div>
    </button>
  )
}

export const BittensorSubnetOptionSkeleton = () => {
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
