import type { TokenId } from "@talismn/chaindata-provider"
import { AccountPillButton } from "@ui/domains/Account/AccountPillButton"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { type FC, useCallback } from "react"

export const SwapBuyInput: FC<{
  account: string
  tokenId: TokenId
  amount: bigint
  maxAmount?: bigint
  onAccountChange: (account: string) => void
  onTokenChange: (tokenId: TokenId) => void
  onAmountChange: (value: bigint) => void
}> = ({ account, tokenId, maxAmount, onAmountChange }) => {
  const handleMaxClick = useCallback(() => {
    if (maxAmount !== undefined) {
      onAmountChange(maxAmount)
    }
  }, [maxAmount, onAmountChange])

  return (
    <div className="flex w-full flex-col gap-6 overflow-hidden rounded p-6">
      <div className="flex w-full justify-between gap-6">
        <AccountPillButton
          address={account}
          onClick={() => {
            // TODO
          }}
        />
        <MaxButton tokenId={tokenId} maxAmount={maxAmount} onClick={handleMaxClick} />
      </div>
      <div></div>
    </div>
  )
}

const MaxButton: FC<{
  tokenId: TokenId
  maxAmount?: bigint
  onClick: () => void
}> = ({ tokenId, maxAmount, onClick }) => {
  if (maxAmount === undefined) return null

  return (
    <button
      type="button"
      className="rounded-full bg-grey-800 px-3 py-1.5 text-body-secondary text-sm hover:bg-grey-700"
      onClick={onClick}
    >
      <TokensAndFiat planck={maxAmount} tokenId={tokenId} noFiat noCountUp />
    </button>
  )
}
