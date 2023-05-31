import { ArrowRightIcon } from "@talisman/theme/icons"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { Address, BalanceFormatter } from "@talismn/balances"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { TokenRates } from "@talismn/token-rates"
import { classNames } from "@talismn/util"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AssetLogoBase } from "@ui/domains/Asset/AssetLogo"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import Fiat from "@ui/domains/Asset/Fiat"
import Tokens from "@ui/domains/Asset/Tokens"
import useChain from "@ui/hooks/useChain"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useIsKnownAddress } from "@ui/hooks/useIsKnownAddress"
import { FC, useMemo } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

const FormattedAddress = ({ address, className }: { address: string; className?: string }) => {
  const isKnown = useIsKnownAddress(address)

  const label = useMemo(
    () => (isKnown && isKnown.value.name) ?? shortenAddress(address),
    [address, isKnown]
  )

  return (
    <Tooltip>
      <TooltipTrigger className={classNames("flex items-center gap-2", className)}>
        <AccountIcon address={address} className="shrink-0 text-[2rem]" />
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
      </TooltipTrigger>
      <TooltipContent>{address}</TooltipContent>
    </Tooltip>
  )
}

const NetworkAndAccount: FC<{ networkId: string; networkName: string; address: string }> = ({
  networkId,
  networkName,
  address,
}) => (
  <div className="flex w-[150px] flex-col items-center gap-5 overflow-hidden">
    <div className="flex w-full items-center justify-center gap-2">
      <ChainLogo id={networkId} className="!h-9 !w-9 shrink-0" />
      <div className="text-md text-body overflow-hidden text-ellipsis whitespace-nowrap font-bold">
        {networkName}
      </div>
    </div>
    <div>
      <FormattedAddress address={address} className="max-w-[130px]" />
    </div>
  </div>
)

export const SignViewXTokensTransfer: FC<{
  value: bigint
  tokenLogo?: string
  tokenSymbol: string
  tokenDecimals: number
  coingeckoId?: string
  tokenRates?: TokenRates | null
  fromNetwork: EvmNetworkId | ChainId
  fromAddress: Address
  toNetwork?: EvmNetworkId | ChainId
  toAddress?: Address
}> = ({
  value,
  tokenLogo,
  tokenSymbol,
  tokenDecimals,
  tokenRates,
  fromNetwork,
  fromAddress,
  toNetwork,
  toAddress,
}) => {
  const amount = useMemo(
    () => new BalanceFormatter(value, tokenDecimals, tokenRates ?? undefined),
    [tokenDecimals, tokenRates, value]
  )

  const fromChain = useChain(fromNetwork)
  const fromEvmNetwork = useEvmNetwork(fromNetwork)
  const toChain = useChain(toNetwork)
  const toEvmNetwork = useEvmNetwork(toAddress)

  const fromNetworkName = useMemo(
    () => fromChain?.name ?? fromEvmNetwork?.name ?? "Unknown",
    [fromChain, fromEvmNetwork]
  )
  const toNetworkName = useMemo(
    () => toChain?.name ?? toEvmNetwork?.name ?? "Unknown",
    [toChain, toEvmNetwork]
  )

  if (!amount) return null

  return (
    <div className="flex w-full flex-col items-center gap-16">
      <div className="flex items-center gap-4">
        <div>
          <AssetLogoBase rounded url={tokenLogo} className="h-24 w-24 text-[48px]" />
        </div>
        <div className="text-body flex-col items-start gap-4">
          <div className="text-md text-left font-bold">
            <Tokens
              amount={amount.tokens}
              decimals={tokenDecimals}
              symbol={tokenSymbol}
              noCountUp
            />
          </div>
          {amount.fiat("usd") && (
            <div className="text-body-secondary text-left">
              (<Fiat amount={amount.fiat("usd")} noCountUp currency="usd" />)
            </div>
          )}
        </div>
      </div>
      <div className="flex w-full items-center justify-center gap-8">
        <NetworkAndAccount
          networkId={fromNetwork}
          networkName={fromNetworkName}
          address={fromAddress}
        />
        <div className="shrink-0">
          <ArrowRightIcon className="text-[28px]" />
        </div>
        <NetworkAndAccount
          networkId={toNetwork as string}
          networkName={toNetworkName}
          address={toAddress as string}
        />
      </div>
    </div>
  )
}
