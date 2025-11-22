import { ALPHA_PRICE_SCALE } from "@talismn/balances"
import { subDTaoTokenId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { useMemo } from "react"

import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { type SubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/types"
import { useToken } from "@ui/state"

import { BittensorAlphaPrice } from "./BittensorAlphaPrice"

type BittensorSubnetOptionProps = {
  networkId: string
  option: SubnetData
  selectedNetuid: number | null | undefined
  taoTokenId: string
  isSubnetsLoading: boolean
  isSubnetsError: boolean
  handleSelectSubnet: (subnetNetuid: number) => void
}

export const BittensorSubnetOption = ({
  networkId,
  option,
  selectedNetuid,
  taoTokenId,
  // isSubnetsLoading,
  isSubnetsError,
  handleSelectSubnet,
}: BittensorSubnetOptionProps) => {
  const tokenId = subDTaoTokenId(networkId, option.netuid!)
  const token = useToken(tokenId)
  const isSelected = option.netuid === selectedNetuid

  const formattedEmission = useMemo(
    () =>
      (Number(BigInt(option?.emission || 0) * 100n) / Number(ALPHA_PRICE_SCALE)).toFixed(2) + "%",
    [option?.emission],
  )

  const emission = isSubnetsError ? "--" : formattedEmission

  if (token?.type !== "substrate-dtao") return null

  return (
    <button
      type="button"
      key={option.netuid}
      onClick={() => handleSelectSubnet(option.netuid!)}
      className={classNames(
        "hover:bg-grey-750 focus:bg-grey-700 flex h-[5.8rem] w-full shrink-0 items-center gap-6 overflow-hidden px-12 pl-8 text-left",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isSelected && "bg-grey-800 text-body-secondary",
      )}
    >
      <TokenLogo tokenId={tokenId} className="size-16 shrink-0" />
      <div className="flex h-full grow flex-col justify-center gap-2 overflow-hidden text-sm">
        <div className="flex w-full items-center justify-between gap-8 overflow-hidden text-white">
          <div className="truncate">
            {token.netuid} | {token.subnetName} {token.symbol}
          </div>
          <div className="shrink-0">{emission}</div>
        </div>

        <div className="text-body-secondary flex w-full items-center justify-between gap-8 overflow-hidden text-xs">
          <div className="flex grow items-center gap-2 overflow-hidden">
            <TokensAndFiat
              tokenId={taoTokenId}
              planck={option.total_tao}
              noFiat
              noCountUp
              noTooltip
            />
            <div className="bg-body-disabled inline-block size-2 rounded-full" />
            <TokensAndFiat
              tokenId={tokenId}
              planck={option.total_alpha}
              noFiat
              noCountUp
              noTooltip
            />
          </div>
          <div className="shrink-0">
            <BittensorAlphaPrice
              taoTokenId={taoTokenId}
              price={option.price}
              priceChange24h={option.price_change_1_day}
            />
          </div>
        </div>
      </div>
    </button>
  )
}

export const BittensorSubnetOptionSkeleton = () => {
  return (
    <div className="flex h-[5.8rem] w-full shrink-0 items-center gap-6 px-12 pl-8 text-left">
      <div className="bg-grey-750 size-16 animate-pulse rounded-full"></div>
      <div className="grow space-y-[5px]">
        <div className={"text-body flex w-full justify-between text-sm font-bold"}>
          <div>
            <div className="bg-grey-750 rounded-xs inline-block h-7 w-56 animate-pulse"></div>
          </div>
          <div>
            <div className="bg-grey-750 rounded-xs inline-block h-7 w-20 animate-pulse"></div>
          </div>
        </div>
        <div className="text-body-secondary flex w-full items-center justify-between gap-2 text-right text-xs font-light">
          <div>
            <div className="bg-grey-800 rounded-xs inline-block h-6 w-40 animate-pulse"></div>
          </div>
          <div className="grow text-right">
            <div className="bg-grey-800 rounded-xs inline-block h-6 w-36 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
