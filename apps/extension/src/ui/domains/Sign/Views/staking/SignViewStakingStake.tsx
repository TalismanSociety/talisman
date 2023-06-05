import { TokenId } from "@talismn/chaindata-provider"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { FC } from "react"

export const SignViewStakingStake: FC<{
  planck: bigint
  tokenId: TokenId
  autoCompound?: number
}> = ({ planck, tokenId, autoCompound }) => {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div>You are staking</div>
      <div className="text-body flex items-center gap-2">
        <TokenLogo tokenId={tokenId} className="inline h-[1em] w-[1em]" />{" "}
        <TokensAndFiat planck={planck} tokenId={tokenId} noCountUp />
      </div>
      {!!autoCompound && (
        <>
          <div>
            with <span className="text-body">{autoCompound}%</span> of rewards
          </div>
          <div>auto-compounding</div>
        </>
      )}
    </div>
  )
}
