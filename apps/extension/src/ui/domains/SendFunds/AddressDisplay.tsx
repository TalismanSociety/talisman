import { convertAddress } from "@talisman/util/convertAddress"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { Address as TAddress } from "@talismn/balances"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { CopyIcon, ExternalLinkIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import useChain from "@ui/hooks/useChain"
import { useContact } from "@ui/hooks/useContact"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useOnChainId } from "@ui/hooks/useOnChainId"
import { copyAddress } from "@ui/util/copyAddress"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"
import urlJoin from "url-join"

import { AccountIcon } from "../Account/AccountIcon"
import { AccountTypeIcon } from "../Account/AccountTypeIcon"

const useBlockExplorerUrl = (
  address?: TAddress | null,
  chainId?: ChainId | null,
  evmNetworkId?: EvmNetworkId | null,
  shouldFormatAddress = true
) => {
  const chain = useChain(chainId as string)
  const evmNetwork = useEvmNetwork(evmNetworkId as string)
  const resolvedAddress = useMemo(() => {
    return shouldFormatAddress && chain && address ? convertAddress(address, chain.prefix) : address
  }, [address, chain, shouldFormatAddress])

  return useMemo(() => {
    if (resolvedAddress && evmNetwork?.explorerUrl)
      return urlJoin(evmNetwork.explorerUrl, "address", resolvedAddress)
    if (resolvedAddress && chain?.subscanUrl)
      return urlJoin(chain.subscanUrl, "address", resolvedAddress)
    return null
  }, [chain?.subscanUrl, evmNetwork?.explorerUrl, resolvedAddress])
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
  chainId: ChainId | null | undefined
  evmNetworkId: EvmNetworkId | null | undefined
  className?: string
}

export const AddressDisplay: FC<AddressDisplayProps> = ({
  address,
  chainId,
  evmNetworkId,
  className,
}) => {
  const chain = useChain(chainId as string)
  const account = useAccountByAddress(address)
  const contact = useContact(address, chain?.genesisHash)
  const blockExplorerUrl = useBlockExplorerUrl(
    address,
    chainId,
    evmNetworkId,
    !!account || !!contact
  )

  const resolvedAddress = useMemo(() => {
    return chain && address ? convertAddress(address, chain.prefix) : address
  }, [address, chain])

  const [onChainId] = useOnChainId(resolvedAddress ?? undefined)

  const text = useMemo(
    () => account?.name ?? contact?.name ?? (address ? shortenAddress(address, 6, 6) : null),
    [account?.name, address, contact?.name]
  )

  const handleCopyAddress = useCallback(() => {
    copyAddress((!!account || !!contact ? resolvedAddress : address) as string)
  }, [account, address, contact, resolvedAddress])

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
          className
        )}
      >
        <AccountIcon
          className="!text-lg"
          address={resolvedAddress}
          genesisHash={account?.genesisHash ?? contact?.genesisHash}
        />
        <div className="leading-base grow truncate">{text}</div>
        <AccountTypeIcon
          origin={account?.origin}
          className="text-primary"
          signetUrl={account?.signetUrl as string}
        />
        {blockExplorerUrl ? (
          <a href={blockExplorerUrl} target="_blank" className="text-grey-300 hover:text-white">
            <ExternalLinkIcon />
          </a>
        ) : (
          <button
            onClick={handleCopyAddress}
            type="button"
            className="text-md text-grey-300 hover:text-white"
          >
            <CopyIcon />
          </button>
        )}
      </TooltipTrigger>
    </Tooltip>
  )
}
