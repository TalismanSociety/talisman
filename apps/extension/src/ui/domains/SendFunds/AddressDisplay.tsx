import { CopyIcon, ExternalLinkIcon } from "@talisman/theme/icons"
import { convertAddress } from "@talisman/util/convertAddress"
import { Address as TAddress } from "@talismn/balances"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
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
import { Address } from "../Account/Address"

const useBlockExplorerUrl = (
  address?: TAddress | null,
  chainId?: ChainId | null,
  evmNetworkId?: EvmNetworkId | null
) => {
  const chain = useChain(chainId as string)
  const evmNetwork = useEvmNetwork(evmNetworkId as string)
  const resolvedAddress = useMemo(() => {
    return chain && address ? convertAddress(address, chain.prefix) : address
  }, [address, chain])

  return useMemo(() => {
    if (resolvedAddress && evmNetwork?.explorerUrl)
      return urlJoin(evmNetwork.explorerUrl, "address", resolvedAddress)
    if (resolvedAddress && chain?.subscanUrl)
      return urlJoin(chain.subscanUrl, "address", resolvedAddress)
    return null
  }, [chain?.subscanUrl, evmNetwork?.explorerUrl, resolvedAddress])
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
  const { t } = useTranslation()
  const account = useAccountByAddress(address)
  const contact = useContact(address)
  const chain = useChain(chainId as string)
  const blockExplorerUrl = useBlockExplorerUrl(address, chainId, evmNetworkId)

  const resolvedAddress = useMemo(() => {
    return chain && address ? convertAddress(address, chain.prefix) : address
  }, [address, chain])

  const onChainId = useOnChainId(resolvedAddress ?? undefined)

  const text = useMemo(
    () =>
      account?.name ??
      contact?.name ??
      (resolvedAddress ? (
        <Address address={resolvedAddress} startCharCount={6} endCharCount={6} noTooltip />
      ) : null),
    [account?.name, contact?.name, resolvedAddress]
  )

  const handleCopyAddress = useCallback(() => {
    copyAddress(resolvedAddress as string)
  }, [resolvedAddress])

  if (!resolvedAddress || !text) return null

  return (
    <Tooltip>
      <TooltipContent>
        <div className="flex flex-col gap-2">
          {typeof onChainId === "string" && (
            <div className="flex gap-1">
              <div>{t("Domain:")}</div>
              <div>{onChainId}</div>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <div>{t("Original address:")}</div>
            <div>{address}</div>
          </div>
          <div className="flex flex-col gap-1">
            <div>{t("{{chainName}} format:", { chainName: chain?.name || "Generic" })}</div>
            <div>{resolvedAddress}</div>
          </div>
        </div>
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
          genesisHash={account?.genesisHash}
        />
        <div className="leading-base grow overflow-hidden text-ellipsis whitespace-nowrap">
          {text}
        </div>
        <AccountTypeIcon origin={account?.origin} className="text-primary" />
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
