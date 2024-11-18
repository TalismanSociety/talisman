import { UserIcon } from "@talismn/icons"
import { classNames, formatTokenDecimals } from "@talismn/util"
import { useTranslation } from "react-i18next"

import { Tokens } from "@ui/domains/Asset/Tokens"
import { useToken } from "@ui/state"

import { BondOption as BondOptionType } from "../hooks/bittensor/types"

type BondDrawerProps = {
  option: BondOptionType
  selectedPoolId: number | string | null | undefined
  handleSelectPoolId: (poolId: number | string) => void
  tokenId: string
}

export const BondOptionSkeleton = () => {
  return (
    <div className="bg-black-tertiary border-black-tertiary flex h-[6.7rem] w-full flex-col gap-[10px] rounded-sm border-[1px] p-[12px] text-xs">
      <div className="bg-grey-700 rounded-xs h-[1.6rem] w-[10rem] animate-pulse" />
      <div className="flex w-full justify-between">
        <div className="flex items-center" />
        <div className="bg-grey-700 rounded-xs h-[1.6rem] w-[15rem] animate-pulse" />
        <div className="bg-grey-700 rounded-xs ml-auto h-[1.6rem] w-[3rem] animate-pulse" />
      </div>
    </div>
  )
}

export const BondOption = ({
  option,
  selectedPoolId,
  handleSelectPoolId,
  tokenId,
}: BondDrawerProps) => {
  const { t } = useTranslation()
  const token = useToken(tokenId)
  return (
    <button
      key={option.poolId}
      onClick={() => handleSelectPoolId(option.poolId)}
      className={classNames(
        "bg-black-tertiary text-body-secondary border-black-tertiary flex w-full flex-col gap-[10px] rounded-sm border-[1px] p-[12px] text-xs",
        option.poolId === selectedPoolId && "border-grey-400 text-grey-300",
      )}
    >
      <div
        className={classNames(
          "text-sm font-bold",
          option.poolId === selectedPoolId && "text-white",
        )}
      >
        {option.name}
      </div>
      <div className="flex w-full justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4">
            <Tokens
              amount={formatTokenDecimals(option.totalStaked, token?.decimals ?? 9)}
              symbol={token?.symbol}
            />
            {t("staked")}
          </div>
          <div className="bg-body-disabled inline-block size-2 rounded-full" />
          <div className="flex gap-4">
            {option.totalStakers} <UserIcon />
          </div>
        </div>
        <div className="ml-auto">{option.apr ? `${(option.apr * 100).toFixed(2)}%` : "N/A"}</div>
      </div>
    </button>
  )
}
