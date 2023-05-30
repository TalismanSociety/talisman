import { ZapIcon, ZapOffIcon } from "@talisman/theme/icons"
import { FC } from "react"

export const SignViewStakingHeader: FC<{ unstake?: boolean }> = ({ unstake }) => {
  const Icon = unstake ? ZapOffIcon : ZapIcon
  return (
    <div>
      <div className="bg-grey-800 mb-8 inline-flex h-24 w-24 items-center justify-center rounded-full">
        <Icon className="text-primary-500 text-[28px]" />
      </div>
    </div>
  )
}
