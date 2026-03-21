import { getAccountGenesisHash, getAccountSignetUrl } from "@core/domains/keyring/exports"
import type { Address as TAddress } from "@talismn/balances"
import type { DotNetworkId } from "@talismn/chaindata-provider"
import { encodeAnyAddress } from "@talismn/crypto"
import { classNames } from "@talismn/util"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useOnChainId } from "@ui/hooks/useOnChainId"
import { useAccountByAddress } from "@ui/state/accounts"
import { useNetworkById } from "@ui/state/chaindata"
import { shortenAddress } from "@ui/util/shortenAddress"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

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
    [account?.name, address]
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
          "inline-flex max-w-full flex-nowrap items-center gap-4 overflow-hidden text-base text-body",
          className
        )}
      >
        <AccountIcon
          className="text-lg!"
          address={resolvedAddress}
          genesisHash={getAccountGenesisHash(account)}
        />
        <div className="grow truncate leading-base">{text}</div>
        <AccountTypeIcon
          type={account?.type}
          className="text-primary"
          signetUrl={getAccountSignetUrl(account)}
        />
      </TooltipTrigger>
    </Tooltip>
  )
}
