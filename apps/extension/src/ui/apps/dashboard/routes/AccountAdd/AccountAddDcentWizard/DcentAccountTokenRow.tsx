import { BalanceFormatter, Balances } from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import Fiat from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import Tokens from "@ui/domains/Asset/Tokens"
import useChain from "@ui/hooks/useChain"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { FC, useMemo } from "react"

export const DcentAccountTokenRow: FC<{ address: string; token: Token; balances: Balances }> = ({
  address,
  token,
  balances,
}) => {
  const evmNetwork = useEvmNetwork(token?.evmNetwork?.id)
  const chain = useChain(token?.chain?.id)
  const tokenRate = useTokenRates(token.id)

  const { balance, isLoading } = useMemo(() => {
    const accountTokenBalances = balances.find({ tokenId: token.id, address })
    const free = accountTokenBalances.each.reduce((total, b) => total + b.free.planck, 0n)

    return {
      balance: new BalanceFormatter(free, token.decimals, tokenRate),
      isLoading:
        !accountTokenBalances.count || accountTokenBalances.each.some((b) => b.status !== "live"),
    }
  }, [address, balances, token.decimals, token.id, tokenRate])

  return (
    <div className="text-body-secondary bg-grey-900 mt-4 flex h-[4.8rem] items-center gap-4 rounded-sm px-8">
      <TokenLogo className="text-lg" tokenId={token.id} />
      <div className="flex grow flex-col gap-1">
        <div className="text-body text-sm">{token.symbol}</div>
        <div className="text-body-secondary text-xs">{chain?.name ?? evmNetwork?.name}</div>
      </div>
      <div className={classNames("flex flex-col gap-1 text-right", isLoading && "animate-pulse")}>
        <div className="text-body text-sm">
          <Tokens
            amount={balance.tokens}
            decimals={token.decimals}
            symbol={token.symbol}
            isBalance
          />
        </div>
        <div className="text-body-secondary text-xs">
          <Fiat amount={balance.fiat("usd")} currency={"usd"} isBalance />
        </div>
      </div>
    </div>
  )
}
