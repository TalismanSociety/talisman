import { UserIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC } from "react"

import { YieldValidator } from "../services/yieldApi"

interface ValidatorItemProps {
  validator: YieldValidator
  isSelected: boolean
  onClick: () => void
}

export const ValidatorItem: FC<ValidatorItemProps> = ({ validator, isSelected, onClick }) => {
  // Safety checks for required fields
  if (!validator || !validator.name || !validator.address) {
    return null
  }

  const formatTvl = (tvl: string) => {
    const num = parseFloat(tvl)
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toFixed(2)
  }

  const formatRewardRate = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "flex w-full flex-col gap-4 rounded border p-8 text-left transition-colors",
        isSelected
          ? "bg-grey-800 border-white"
          : "border-grey-700 bg-grey-900 hover:border-grey-600 hover:bg-grey-800",
      )}
    >
      {/* First row: Name only */}
      <div className="text-body text-xs font-medium">{validator.name}</div>

      {/* Second row: TVL - Stakers - Reward Rate */}
      <div className="text-grey-400 flex items-center justify-between text-xs">
        <div className="flex items-center gap-8">
          <span>{formatTvl(validator.tvl || "0")} staked</span>
          {validator.nominatorCount && (
            <span className="flex items-center gap-4">
              {validator.nominatorCount}
              <UserIcon />
            </span>
          )}
        </div>
        <div className="font-medium text-green-400">
          {formatRewardRate(validator.rewardRate?.total || 0)}
        </div>
      </div>
    </button>
  )
}
