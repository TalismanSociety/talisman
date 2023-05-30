import { TokenId } from "@talismn/chaindata-provider"
import useToken from "@ui/hooks/useToken"
import { FC } from "react"

export const SignViewStakingSetAutoCompound: FC<{
  tokenId: TokenId
  autoCompound: number
}> = ({ tokenId, autoCompound }) => {
  const token = useToken(tokenId)

  if (!token) return null

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div>
        All future <span className="text-body">{token.symbol}</span> staking rewards will be
      </div>
      <div>
        <span className="text-body">{autoCompound}%</span> auto-compounded
      </div>
    </div>
  )
}
