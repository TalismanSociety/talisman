import { ZapIcon } from "@talisman/theme/icons"
import { TokenId } from "@talismn/chaindata-provider"
import { ViewDetailsEth } from "@ui/domains/Sign/ViewDetails/ViewDetailsEth"
import useToken from "@ui/hooks/useToken"
import { FC } from "react"

export const SignViewStakingSetAutoCompound: FC<{
  tokenId: TokenId
  autoCompound: number
}> = ({ tokenId, autoCompound }) => {
  const token = useToken(tokenId)

  if (!token) return null

  return (
    <div className="text-center">
      <div className="bg-grey-800 inline-flex h-24 w-24 items-center justify-center rounded-full">
        <ZapIcon className="text-primary-500 text-[28px]" />
      </div>
      <div className="text-body mb-16 mt-8 text-lg font-semibold">Set auto-compounding</div>
      <div className="mb-16 flex w-full flex-col items-center gap-4">
        <div>
          All future <span className="text-body">{token.symbol}</span> staking rewards will be
        </div>
        <div>
          <span className="text-body">{autoCompound}%</span> auto-compounded
        </div>
      </div>
      <ViewDetailsEth />
    </div>
  )
}
