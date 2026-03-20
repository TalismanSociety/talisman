import { getAccountGenesisHash, getAccountSignetUrl } from "@core/domains/keyring/exports"
import type { Address as TAddress } from "@talismn/balances"
import { getBlockExplorerUrls, type NetworkId } from "@talismn/chaindata-provider"
import { encodeAddressSs58, encodeAnyAddress, normalizeAddress } from "@talismn/crypto"
import { CopyIcon, ExternalLinkIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useOnChainId } from "@ui/hooks/useOnChainId"
import { useAccountByAddress } from "@ui/state/accounts"
import { useAnyNetwork, useNetworkById } from "@ui/state/chaindata"
import { copyAddress } from "@ui/util/copyAddress"
import { shortenAddress } from "@ui/util/shortenAddress"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { AccountIcon } from "../Account/AccountIcon"
import { AccountTypeIcon } from "../Account/AccountTypeIcon"

const useBlockExplorerUrl = (
  address: TAddress | null | undefined,
  networkId: NetworkId | null | undefined,
  shouldFormatAddress = true
) => {
  const network = useAnyNetwork(networkId)
  const resolvedAddress = useMemo(() => {
    if (!network || !shouldFormatAddress || !address) return address

    return network.platform === "polkadot" && network.account === "*25519"
      ? encodeAddressSs58(address, network.prefix)
      : normalizeAddress(address)
  }, [address, network, shouldFormatAddress])

  return useMemo(() => {
    if (!resolvedAddress || !network?.blockExplorerUrls.length) return null
    return getBlockExplorerUrls(network, { type: "address", address: resolvedAddress })[0] ?? null
  }, [network, resolvedAddress])
}

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
  // allow undefined but force developer to fill the property so he doesn't forget
  address: TAddress | null | undefined
  networkId: string | null | undefined
  className?: string
  accountIconClassName?: string
}

export const AddressDisplay: FC<AddressDisplayProps> = ({
  address,
  networkId,
  className,
  accountIconClassName,
}) => {
  const chain = useNetworkById(networkId as string, "polkadot")
  const account = useAccountByAddress(address)
  const blockExplorerUrl = useBlockExplorerUrl(address, networkId, !!account)

  const resolvedAddress = useMemo(() => {
    return chain && address ? encodeAnyAddress(address, { ss58Format: chain.prefix }) : address
  }, [address, chain])

  const [onChainId] = useOnChainId(resolvedAddress ?? undefined)

  const text = useMemo(
    () => account?.name ?? (address ? shortenAddress(address, 6, 6) : null),
    [account?.name, address]
  )

  const handleCopyAddress = useCallback(() => {
    copyAddress((account ? resolvedAddress : address) as string)
  }, [account, address, resolvedAddress])

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
          className={classNames("!text-lg", accountIconClassName)}
          address={resolvedAddress}
          genesisHash={getAccountGenesisHash(account)}
        />
        <div className="grow truncate leading-base">{text}</div>
        <AccountTypeIcon
          type={account?.type}
          className="text-primary"
          signetUrl={getAccountSignetUrl(account)}
        />
        {blockExplorerUrl ? (
          <a href={blockExplorerUrl} target="_blank" className="text-grey-300 hover:text-white">
            <ExternalLinkIcon />
          </a>
        ) : (
          <button
            onClick={handleCopyAddress}
            type="button"
            className="text-grey-300 text-md hover:text-white"
          >
            <CopyIcon />
          </button>
        )}
      </TooltipTrigger>
    </Tooltip>
  )
}
