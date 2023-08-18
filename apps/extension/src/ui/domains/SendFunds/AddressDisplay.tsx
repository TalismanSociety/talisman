import { CopyIcon, ExternalLinkIcon } from "@talisman/theme/icons"
import { convertAddress } from "@talisman/util/convertAddress"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { Address } from "@talismn/balances"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import useChain from "@ui/hooks/useChain"
import { useContact } from "@ui/hooks/useContact"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { copyAddress } from "@ui/util/copyAddress"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"
import urlJoin from "url-join"

import { AccountIcon } from "../Account/AccountIcon"
import { AccountTypeIcon } from "../Account/AccountTypeIcon"

const useBlockExplorerUrl = (
  address?: Address | null,
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

const AddressTooltip: FC<{
  address: string
  resolvedAddress: string
  chainName?: string | null
}> = ({ address, resolvedAddress, chainName }) => {
  const { t } = useTranslation()

  if (address === resolvedAddress) return <>{resolvedAddress}</>

  return (
    <>
      <div>{t("Original address:")}</div>
      <div style={{ marginTop: 2 }}>{address}</div>
      <div style={{ marginTop: 4 }}>
        {t("{{chainName}} format:", { chainName: chainName || "Generic" })}
      </div>
      <div style={{ marginTop: 2 }}>{resolvedAddress}</div>
    </>
  )
}

type AddressDisplayProps = {
  // allow undefined but force developer to fill the property so he doesn't forget
  address: Address | null | undefined
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
  const account = useAccountByAddress(address)
  const contact = useContact(address)
  const chain = useChain(chainId as string)
  const blockExplorerUrl = useBlockExplorerUrl(address, chainId, evmNetworkId)

  const resolvedAddress = useMemo(() => {
    return chain && address ? convertAddress(address, chain.prefix) : address
  }, [address, chain])

  const text = useMemo(
    () => account?.name ?? contact?.name ?? shortenAddress(resolvedAddress ?? "", 6, 6),
    [account?.name, contact?.name, resolvedAddress]
  )

  const handleCopyAddress = useCallback(() => {
    copyAddress(resolvedAddress as string)
  }, [resolvedAddress])

  if (!address || !resolvedAddress || !text) return null

  return (
    <Tooltip>
      <TooltipContent>
        <AddressTooltip
          address={address}
          resolvedAddress={resolvedAddress}
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
