import { getAccountGenesisHash } from "@core/domains/keyring/exports"
import type { NetworkId } from "@talismn/chaindata-provider"
import { encodeAddressSs58 } from "@talismn/crypto"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { useAccountByAddress } from "@ui/state/accounts"
import { useNetworkById } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import { copyAddress } from "@ui/util/copyAddress"
import { type FC, useCallback, useMemo } from "react"

import type { SummaryDisplayMode } from "../../types"

export const SummaryAddressDisplay: FC<{
  address: string
  networkId: NetworkId
  mode: SummaryDisplayMode
}> = ({ address, networkId, mode }) => {
  const account = useAccountByAddress(address)
  const chain = useNetworkById(networkId, "polkadot")

  const formattedAddress = useMemo(() => {
    return chain ? encodeAddressSs58(address, chain.prefix) : address
  }, [address, chain])

  const handleClick = useCallback(() => {
    copyAddress(formattedAddress)
  }, [formattedAddress])

  if (mode !== "block")
    return (
      <span className="truncate whitespace-nowrap text-body">
        <AccountIcon
          className={cn("inline-block align-sub text-[1.2em]")}
          address={address}
          genesisHash={getAccountGenesisHash(account)}
        />
        <span className="ml-[0.3em] truncate">
          {account?.name ?? (
            <Address startCharCount={6} endCharCount={4} address={address} noTooltip />
          )}
        </span>
      </span>
    )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex max-w-full items-center gap-2 overflow-hidden text-body"
          onClick={handleClick}
        >
          <div>
            <AccountIcon
              className={cn("inline-block align-sub text-[1.2em]")}
              address={address}
              genesisHash={getAccountGenesisHash(account)}
            />
          </div>
          <div className="truncate">
            {account?.name ?? (
              <Address startCharCount={6} endCharCount={4} address={address} noTooltip />
            )}
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent>{formattedAddress}</TooltipContent>
    </Tooltip>
  )
}
