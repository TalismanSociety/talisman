import { encodeAnyAddress } from "@talismn/util"
import { ChainId, EvmNetworkId } from "extension-core"
import { FC, useCallback, useMemo } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { useContact } from "@ui/hooks/useContact"
import { useCopyToClipboard } from "@ui/hooks/useCopyToClipboard"
import { useAccountByAddress, useChain } from "@ui/state"

export const SummaryAddressDisplay: FC<{
  address: string
  networkId: ChainId | EvmNetworkId
  inline: boolean
}> = ({ address, networkId, inline }) => {
  const copy = useCopyToClipboard()
  const account = useAccountByAddress(address)
  const contact = useContact(address)
  const chain = useChain(networkId)

  const formattedAddress = useMemo(() => {
    return chain ? encodeAnyAddress(address, chain.prefix ?? undefined) : address
  }, [address, chain])

  const handleClick = useCallback(() => {
    copy(formattedAddress)
  }, [copy, formattedAddress])

  if (inline)
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-body truncate whitespace-nowrap">
            <AccountIcon
              className="inline-block align-sub text-[1.2em]"
              address={address}
              genesisHash={account?.genesisHash ?? contact?.genesisHash}
            />
            <span className="ml-[0.3em] truncate">
              {account?.name ?? contact?.name ?? (
                <Address startCharCount={6} endCharCount={4} address={address} />
              )}
            </span>
          </span>
        </TooltipTrigger>
        <TooltipContent>{formattedAddress}</TooltipContent>
      </Tooltip>
    )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="text-body inline-flex max-w-full items-baseline gap-2 overflow-hidden"
          onClick={handleClick}
        >
          <AccountIcon
            address={address}
            genesisHash={account?.genesisHash ?? contact?.genesisHash}
          />
          <div className="truncate">
            {account?.name ?? contact?.name ?? (
              <Address startCharCount={6} endCharCount={4} address={address} noTooltip />
            )}
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent>{formattedAddress}</TooltipContent>
    </Tooltip>
  )
}
