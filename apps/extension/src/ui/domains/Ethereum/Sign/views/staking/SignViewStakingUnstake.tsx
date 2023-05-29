import { ZapOffIcon } from "@talisman/theme/icons"
import { TokenId } from "@talismn/chaindata-provider"
import { ViewDetailsEth } from "@ui/domains/Sign/ViewDetails/ViewDetailsEth"
import useToken from "@ui/hooks/useToken"
import { FC } from "react"

export const SignViewStakingUnstake: FC<{
  tokenId: TokenId
}> = ({ tokenId }) => {
  const token = useToken(tokenId)

  return (
    <div className="text-center">
      <div className="bg-grey-800 inline-flex h-24 w-24 items-center justify-center rounded-full">
        <ZapOffIcon className="text-primary-500 text-[28px]" />
      </div>
      <div className="text-body mb-16 mt-8 text-lg font-semibold">Unbond {token?.symbol}</div>
      <div className="mb-16 flex w-full flex-col items-center gap-4">
        <div>
          You are unbonding <span className="text-body">{token?.symbol}</span>
        </div>
      </div>
      <ViewDetailsEth />
    </div>
  )
}
