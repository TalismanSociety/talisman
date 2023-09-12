import { classNames, encodeAnyAddress } from "@talismn/util"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import useChainByGenesisHash from "@ui/hooks/useChainByGenesisHash"
import { useIsKnownAddress } from "@ui/hooks/useIsKnownAddress"
import { FC, useMemo } from "react"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { AccountIcon } from "./AccountIcon"
import { AccountTypeIcon } from "./AccountTypeIcon"
import { Address } from "./Address"

const FormattedAddressTooltip: FC<{ address: string; genesisHash?: string | null }> = ({
  address,
  genesisHash,
}) => {
  const chain = useChainByGenesisHash(genesisHash)
  const displayAddress = useMemo(
    () => (chain ? encodeAnyAddress(address, chain?.prefix ?? undefined) : address),
    [address, chain]
  )

  return <TooltipContent>{displayAddress}</TooltipContent>
}

export const FormattedAddress: FC<{
  address: string
  withSource?: boolean
  noTooltip?: boolean
  className?: string
}> = ({ address, withSource, noTooltip, className }) => {
  const isKnown = useIsKnownAddress(address)
  const account = useAccountByAddress(address)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={classNames(
            "flex max-w-full items-center gap-[0.5em] overflow-hidden",
            className
          )}
        >
          <AccountIcon
            address={address}
            genesisHash={account?.genesisHash}
            className="text-[1.4em]"
          />
          <span className="max-w-full truncate">
            {isKnown && isKnown.type === "account" ? (
              <>{isKnown.value.name}</>
            ) : (
              <Address address={address} noTooltip />
            )}
          </span>
          {withSource && account && (
            <AccountTypeIcon className="text-primary" origin={account.origin} />
          )}
        </span>
      </TooltipTrigger>
      {!noTooltip && (
        <FormattedAddressTooltip address={address} genesisHash={account?.genesisHash} />
      )}
    </Tooltip>
  )
}
