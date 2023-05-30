import { shortenAddress } from "@talisman/util/shortenAddress"
import { TokenId } from "@talismn/chaindata-provider"
import AccountAvatar from "@ui/domains/Account/Avatar"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useIsKnownAddress } from "@ui/hooks/useIsKnownAddress"
import { FC, useMemo } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

const FormattedAddress = ({ address }: { address: string }) => {
  const isKnown = useIsKnownAddress(address)

  const label = useMemo(
    () => (isKnown && isKnown.value.name) ?? shortenAddress(address),
    [address, isKnown]
  )

  return (
    <Tooltip>
      <TooltipTrigger className="flex max-w-full items-center gap-2">
        <AccountAvatar address={address} className="shrink-0 !text-[1.2em]" />
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{address}</TooltipContent>
    </Tooltip>
  )
}

export const SignViewVotingDelegate: FC<{
  amount: bigint
  tokenId: TokenId
  representative: string
  conviction: number
  trackId: number
}> = ({ amount, tokenId, representative, conviction, trackId }) => {
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between gap-8">
        <div className="whitespace-nowrap">Delegating to</div>
        <div className="text-body grow overflow-hidden text-base">
          <FormattedAddress address={representative} />
        </div>
      </div>
      <div className="flex w-full items-center justify-between">
        <div>Amount</div>
        <div className="text-body">
          <TokenLogo tokenId={tokenId} className="inline h-[1em] w-[1em]" />{" "}
          <TokensAndFiat planck={amount} tokenId={tokenId} noCountUp />
        </div>
      </div>
      <div className="flex w-full items-center justify-between">
        <div>Conviction</div>
        <div className="text-body">{conviction === 0 ? "0.1" : conviction}X</div>
      </div>
      <div className="flex w-full items-center justify-between">
        <div>Track</div>
        <div className="text-body">#{trackId}</div>
      </div>
    </div>
  )
}
