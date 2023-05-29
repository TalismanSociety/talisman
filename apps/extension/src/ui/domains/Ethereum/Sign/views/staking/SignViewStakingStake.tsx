import { ZapIcon } from "@talisman/theme/icons"
import { TokenId } from "@talismn/chaindata-provider"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { ViewDetailsEth } from "@ui/domains/Sign/ViewDetails/ViewDetailsEth"
import useToken from "@ui/hooks/useToken"
import { FC } from "react"

export const SignViewStakingStake: FC<{
  planck: bigint
  tokenId: TokenId
  autoCompound?: number
}> = ({ planck, tokenId, autoCompound }) => {
  const token = useToken(tokenId)

  return (
    <div className="text-center">
      <div className="bg-grey-800 inline-flex h-24 w-24 items-center justify-center rounded-full">
        <ZapIcon className="text-primary-500 text-[28px]" />
      </div>
      <div className="text-body mb-16 mt-8 text-lg font-semibold">Stake {token?.symbol}</div>
      <div className="mb-16 flex w-full flex-col items-center gap-4">
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
      <ViewDetailsEth />
    </div>
  )
}
