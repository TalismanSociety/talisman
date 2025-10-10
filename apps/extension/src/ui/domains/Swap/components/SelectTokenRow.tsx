import { AlertTriangleIcon, CopyIcon, ExternalLinkIcon } from "@talismn/icons"
import { UNKNOWN_TOKEN_URL } from "extension-shared"
import { useAtomValue } from "jotai"
import { loadable } from "jotai/utils"
import { useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { shortenAddress } from "@talisman/util/shortenAddress"
import { useSelectedCurrency, useTokenRatesMap, useTokensMap } from "@ui/state"
import { copyAddress } from "@ui/util/copyAddress"

import { SwappableAssetWithDecimals } from "../swap-modules/common.swap-module"
import { Decimal } from "../swaps-port/Decimal"
import { safeTokensSetAtom } from "../swaps.api"

type Props = {
  asset: SwappableAssetWithDecimals
  networkName: string
  networkLogo?: string
  evmAddress?: `0x${string}`
  substrateAddress?: string
  erc20Address?: string
  onClick: (asset: SwappableAssetWithDecimals, showWarning: boolean) => void
  balance?: Decimal
  explorerUrl?: string
}

export const SelectTokenRow: React.FC<Props> = ({
  asset,
  balance,
  networkLogo,
  networkName,
  erc20Address,
  evmAddress,
  explorerUrl,
  substrateAddress,
  onClick,
}) => {
  const currency = useSelectedCurrency()
  const rates = useTokenRatesMap()
  const tokens = useTokensMap()
  const safeList = useAtomValue(loadable(safeTokensSetAtom))

  const isSafe = useMemo(
    () =>
      safeList.state === "hasData"
        ? safeList.data.has(`${asset.chainId}:${erc20Address?.toLowerCase()}`)
        : false,
    [asset.chainId, erc20Address, safeList],
  )

  const bestGuessRate = useMemo(() => {
    if (!tokens) return undefined
    return Object.entries(rates ?? {}).find(([id]) => tokens[id]?.symbol === asset.symbol)?.[1]
  }, [asset.symbol, rates, tokens])

  const rate = useMemo(() => rates?.[asset.id] ?? bestGuessRate, [asset.id, bestGuessRate, rates])

  const shouldShowWarning = useMemo(
    () => !isSafe && erc20Address !== undefined,
    [erc20Address, isSafe],
  )

  const handleClick = useCallback(() => {
    onClick(asset, shouldShowWarning)
  }, [asset, onClick, shouldShowWarning])

  return (
    <div
      tabIndex={0}
      role="button"
      className="hover:bg-grey-800 grid !h-[64px] !w-full cursor-pointer grid-cols-3 gap-[8px] !rounded-[12px] px-[16px]"
      onClick={handleClick}
      onKeyDown={(e) => ["Enter", " "].includes(e.key) && handleClick?.()}
    >
      <Tooltip>
        <TooltipTrigger>
          <div className="flex w-full items-center gap-[8px]">
            <div className="relative">
              {networkLogo ? (
                <img
                  src={networkLogo}
                  alt=""
                  key={networkLogo}
                  className="border-grey-800 bg-grey-800 absolute -right-[4px] -top-[4px] h-[12px] w-[12px] min-w-[12px] rounded-full border-[2px] sm:h-[20px] sm:w-[20px] sm:min-w-[20px]"
                />
              ) : null}
              <img
                key={asset.image ?? UNKNOWN_TOKEN_URL}
                src={asset.image ?? UNKNOWN_TOKEN_URL}
                alt=""
                className="h-[24px] w-[24px] min-w-[24px] rounded-full sm:h-[40px] sm:w-[40px] sm:min-w-[40px]"
              />
            </div>
            <div className="flex flex-col gap-[4px] overflow-hidden">
              <div className="flex items-center gap-[4px]">
                <p className="text-[14px] leading-none">{asset.symbol}</p>
                {shouldShowWarning && <AlertTriangleIcon className="text-grey-400" size={14} />}
              </div>
              <p className="text-muted-foreground text-[12px] font-medium">
                {rate?.[currency]?.price?.toLocaleString(undefined, {
                  currency,
                  style: "currency",
                }) ?? "-"}
              </p>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="!text-muted-foreground truncate text-[12px] leading-none">{asset.name}</p>
        </TooltipContent>
      </Tooltip>

      <div className="flex flex-col justify-center">
        <p className="text-[14px]">{networkName}</p>
        {erc20Address ? (
          explorerUrl ? (
            <Link
              to={`${explorerUrl}/token/${erc20Address}`}
              target="_blank"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="group flex cursor-pointer items-center gap-[4px]">
                <p className="text-muted-foreground group-hover:text-primary mt-[2px] text-[12px]">
                  {shortenAddress(erc20Address, 6)}
                </p>
                <ExternalLinkIcon className="group-hover:text-primary" size={14} />
              </div>
            </Link>
          ) : (
            <button
              className="group flex cursor-pointer items-center gap-[4px]"
              onClick={(e) => {
                e.stopPropagation()
                copyAddress(erc20Address)
              }}
            >
              <p className="text-muted-foreground group-hover:text-primary mt-[2px] text-[12px]">
                {shortenAddress(erc20Address, 6)}
              </p>
              <CopyIcon size={14} className="group-hover:text-primary" />
            </button>
          )
        ) : null}
      </div>

      {(asset.networkType === "evm" && evmAddress) ||
      (asset.networkType === "substrate" && substrateAddress) ? (
        balance ? (
          <div className="flex flex-col items-end justify-center">
            <p className="text-[14px] font-medium">{balance?.toLocaleString(undefined, {})}</p>
            {rate ? (
              <p className="text-muted-foreground text-[12px]">
                {((rate[currency]?.price ?? 0) * balance.toNumber()).toLocaleString(undefined, {
                  currency,
                  style: "currency",
                })}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col items-end justify-center" />
        )
      ) : (
        <div className="flex items-center justify-end">
          <p className="text-muted-foreground text-right text-[12px]">-</p>
        </div>
      )}
    </div>
  )
}
