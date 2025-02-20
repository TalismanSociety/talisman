import { Address as TAddress } from "@talismn/balances"
import { ChainId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { convertAddress } from "@talisman/util/convertAddress"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { useOnChainId } from "@ui/hooks/useOnChainId"
import { useAccountByAddress, useChain } from "@ui/state"

import { AccountIcon } from "../../Account/AccountIcon"
import { AccountTypeIcon } from "../../Account/AccountTypeIcon"

const AddressTooltip: FC<{
  address: string
  resolvedAddress: string
  onChainId?: string
  chainName?: string | null
}> = ({ address, resolvedAddress, onChainId, chainName }) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-2">
      {typeof onChainId === "string" && (
        <div className="flex gap-1">
          <div>{t("Domain:")}</div>
          <div>{onChainId}</div>
        </div>
      )}

      {address === resolvedAddress && <>{resolvedAddress}</>}

      {address !== resolvedAddress && (
        <div className="flex flex-col gap-1">
          <div>{t("Original address:")}</div>
          <div>{address}</div>
        </div>
      )}
      {address !== resolvedAddress && (
        <div className="flex flex-col gap-1">
          <div>{t("{{chainName}} format:", { chainName: chainName || "Generic" })}</div>
          <div>{resolvedAddress}</div>
        </div>
      )}
    </div>
  )
}

type AddressDisplayProps = {
  address: TAddress | null | undefined
  chainId: ChainId | null | undefined
  className?: string
}

export const StakingAccountDisplay: FC<AddressDisplayProps> = ({ address, chainId, className }) => {
  const chain = useChain(chainId as string)
  const account = useAccountByAddress(address)

  const resolvedAddress = useMemo(() => {
    return chain && address ? convertAddress(address, chain.prefix) : address
  }, [address, chain])

  const [onChainId] = useOnChainId(resolvedAddress ?? undefined)

  const text = useMemo(
    () => account?.name ?? (address ? shortenAddress(address, 6, 6) : null),
    [account?.name, address],
  )

  if (!address || !resolvedAddress || !text) return null

  return (
    <Tooltip>
      <TooltipContent>
        <AddressTooltip
          address={account ? resolvedAddress : address} // don't show both formats for talisman accounts
          resolvedAddress={resolvedAddress}
          onChainId={onChainId ?? undefined}
          chainName={chain?.name}
        />
      </TooltipContent>
      <TooltipTrigger
        className={classNames(
          "text-body inline-flex max-w-full flex-nowrap items-center gap-4 overflow-hidden text-base",
          className,
        )}
      >
        <AccountIcon
          className="!text-lg"
          address={resolvedAddress}
          genesisHash={account?.genesisHash}
        />
        <div className="leading-base grow truncate">{text}</div>
        <AccountTypeIcon
          origin={account?.origin}
          className="text-primary"
          signetUrl={account?.signetUrl as string}
        />
      </TooltipTrigger>
    </Tooltip>
  )
}
