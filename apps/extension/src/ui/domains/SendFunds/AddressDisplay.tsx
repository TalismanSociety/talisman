import { Address as TAddress } from "@talismn/balances"
import { getBlockExplorerUrls, NetworkId } from "@talismn/chaindata-provider"
import { encodeAddressSs58, encodeAnyAddress, normalizeAddress } from "@talismn/crypto"
import { CopyIcon, ExternalLinkIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { getAccountGenesisHash, getAccountSignetUrl } from "extension-core"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { shortenAddress } from "@talisman/util/shortenAddress"
import { useOnChainId } from "@ui/hooks/useOnChainId"
import { useAccountByAddress, useAnyNetwork, useNetworkById } from "@ui/state"
import { copyAddress } from "@ui/util/copyAddress"

import { AccountIcon } from "../Account/AccountIcon"
import { AccountTypeIcon } from "../Account/AccountTypeIcon"

const useBlockExplorerUrl = (
  address: TAddress | null | undefined,
  networkId: NetworkId | null | undefined,
  shouldFormatAddress = true,
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
}

export const AddressDisplay: FC<AddressDisplayProps> = ({ address, networkId, className }) => {
  const chain = useNetworkById(networkId as string, "polkadot")
  const account = useAccountByAddress(address)
  const blockExplorerUrl = useBlockExplorerUrl(address, networkId, !!account)

  const resolvedAddress = useMemo(() => {
    return chain && address ? encodeAnyAddress(address, { ss58Format: chain.prefix }) : address
  }, [address, chain])

  const [onChainId] = useOnChainId(resolvedAddress ?? undefined)

  const text = useMemo(
    () => account?.name ?? (address ? shortenAddress(address, 6, 6) : null),
    [account?.name, address],
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
