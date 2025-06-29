import { Address, BalanceFormatter } from "@talismn/balances"
import { NetworkId } from "@talismn/chaindata-provider"
import { ArrowRightIcon } from "@talismn/icons"
import { TokenRates } from "@talismn/token-rates"
import { classNames } from "@talismn/util"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { shortenAddress } from "@talisman/util/shortenAddress"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { useIsKnownAddress } from "@ui/hooks/useIsKnownAddress"
import { useNetworkById, useSelectedCurrency } from "@ui/state"

const FormattedAddress = ({ address, className }: { address: string; className?: string }) => {
  const isKnown = useIsKnownAddress(address)

  const label = useMemo(
    () => (isKnown && isKnown.value.name) ?? shortenAddress(address),
    [address, isKnown],
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
      <NetworkLogo networkId={networkId} className="!h-9 !w-9 shrink-0" />
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
  fromNetwork: NetworkId
  fromAddress: Address
  toNetwork: NetworkId
  toAddress: Address
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
  const { t } = useTranslation()
  const sourceNetwork = useNetworkById(fromNetwork)
  const targetNetworkNetwork = useNetworkById(toNetwork)

  const amount = useMemo(
    () => new BalanceFormatter(value, tokenDecimals, tokenRates ?? undefined),
    [tokenDecimals, tokenRates, value],
  )

  const currency = useSelectedCurrency()

  return (
    <div className="flex w-full flex-col items-center gap-16">
      <div className="flex items-center gap-4">
        <div>
          <AssetLogo url={tokenLogo} className="h-24 w-24 text-[48px]" />
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
          {amount.fiat(currency) && (
            <div className="text-body-secondary text-left">
              (<Fiat amount={amount} noCountUp />)
            </div>
          )}
        </div>
      </div>
      <div className="flex w-full items-center justify-center gap-8">
        <NetworkAndAccount
          networkId={fromNetwork}
          networkName={sourceNetwork?.name ?? t("Unknown")}
          address={fromAddress}
        />
        <div className="shrink-0">
          <ArrowRightIcon className="text-[28px]" />
        </div>
        <NetworkAndAccount
          networkId={toNetwork as string}
          networkName={targetNetworkNetwork?.name ?? t("Unknown")}
          address={toAddress as string}
        />
      </div>
    </div>
  )
}
