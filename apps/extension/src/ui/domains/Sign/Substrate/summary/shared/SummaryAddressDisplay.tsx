import { NetworkId } from "@talismn/chaindata-provider"
import { encodeAddressSs58 } from "@talismn/crypto"
import { classNames } from "@talismn/util"
import { getAccountGenesisHash } from "extension-core"
import { FC, useCallback, useMemo } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { useAccountByAddress, useNetworkById } from "@ui/state"
import { copyAddress } from "@ui/util/copyAddress"

import { SummaryDisplayMode } from "../../types"

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
      <span className="text-body truncate whitespace-nowrap">
        <AccountIcon
          className={classNames("inline-block align-sub text-[1.2em]")}
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
          className="text-body inline-flex max-w-full items-center gap-2 overflow-hidden"
          onClick={handleClick}
        >
          <div>
            <AccountIcon
              className={classNames("inline-block align-sub text-[1.2em]")}
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
