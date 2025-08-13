import { Address as TAddress } from "@talismn/balances"
import { DotNetworkId } from "@talismn/chaindata-provider"
import { encodeAnyAddress } from "@talismn/crypto"
import { classNames } from "@talismn/util"
import { getAccountGenesisHash, getAccountSignetUrl } from "extension-core"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { shortenAddress } from "@talisman/util/shortenAddress"
import { useOnChainId } from "@ui/hooks/useOnChainId"
import { useAccountByAddress, useNetworkById } from "@ui/state"

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
  chainId: DotNetworkId | null | undefined
  className?: string
}

export const StakingAccountDisplay: FC<AddressDisplayProps> = ({ address, chainId, className }) => {
  const chain = useNetworkById(chainId as string, "polkadot")
  const account = useAccountByAddress(address)

  const resolvedAddress = useMemo(() => {
    return chain && address ? encodeAnyAddress(address, { ss58Format: chain.prefix }) : address
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
          genesisHash={getAccountGenesisHash(account)}
        />
        <div className="leading-base grow truncate">{text}</div>
        <AccountTypeIcon
          type={account?.type}
          className="text-primary"
          signetUrl={getAccountSignetUrl(account)}
        />
      </TooltipTrigger>
    </Tooltip>
  )
}
