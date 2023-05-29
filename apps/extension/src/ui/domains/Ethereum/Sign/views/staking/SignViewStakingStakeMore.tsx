import { ZapIcon } from "@talisman/theme/icons"
import { TokenId } from "@talismn/chaindata-provider"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { ViewDetailsEth } from "@ui/domains/Sign/ViewDetails/ViewDetailsEth"
import { FC } from "react"

export const SignViewStakingStakeMore: FC<{
  planck: bigint
  tokenId: TokenId
}> = ({ planck, tokenId }) => {
  return (
    <div className="text-center">
      <div className="bg-grey-800 inline-flex h-24 w-24 items-center justify-center rounded-full">
        <ZapIcon className="text-primary-500 text-[28px]" />
      </div>
      <div className="text-body mb-16 mt-8 text-lg font-semibold">Increase stake</div>
      <div className="mb-16 flex w-full flex-col items-center gap-4">
        <div>You are adding</div>
        <div className="text-body flex items-center gap-2">
          <TokenLogo tokenId={tokenId} className="inline h-[1em] w-[1em]" />{" "}
          <TokensAndFiat planck={planck} tokenId={tokenId} noCountUp />
        </div>
        <div>to your staked balance</div>
      </div>
      <ViewDetailsEth />
    </div>
  )
}
