import type { IdenticonType } from "@core/domains/accounts/types"
import type { Address } from "@core/types/base"
import { TalismanOrb } from "@talismn/orb"
import { useNetworkByGenesisHash } from "@ui/state/chaindata"
import { useSetting } from "@ui/state/settings"
import { cn } from "@ui/util/cn"
import { type FC, memo, Suspense } from "react"

import { NetworkLogo } from "../Networks/NetworkLogo"
import { PolkadotAvatar } from "./AccountIcon/PolkadotAvatar"

export type AccountIconProps = {
  address: Address
  className?: string
  genesisHash?: `0x${string}` | null
  type?: IdenticonType
}

const ChainBadge = ({ genesisHash }: { genesisHash: `0x${string}` }) => {
  const chain = useNetworkByGenesisHash(genesisHash)

  return chain ? (
    <NetworkLogo
      networkId={chain.id}
      className="absolute! top-[-0.2em] right-[-0.2em] z-10 rounded-full bg-grey-800 text-[0.5em]"
    />
  ) : null
}

const AccountIconWithSettings = memo(
  ({ address, className, genesisHash }: Omit<AccountIconProps, "type">) => {
    const [identiconType] = useSetting("identiconType")

    return (
      <AccountIconBase
        address={address}
        className={className}
        genesisHash={genesisHash}
        displayType={identiconType ?? "talisman-orb"}
      />
    )
  }
)

const AccountIconBase = memo(
  ({
    address,
    className,
    genesisHash,
    displayType,
  }: Omit<AccountIconProps, "type"> & { displayType: IdenticonType }) => {
    return (
      <div className={cn("relative inline-block shrink-0", className)}>
        {displayType === "polkadot-identicon" ? (
          <PolkadotAvatar address={address} className="block! h-[1em] w-[1em]" />
        ) : (
          <TalismanOrb seed={address} />
        )}
        {genesisHash ? <ChainBadge genesisHash={genesisHash} /> : null}
      </div>
    )
  }
)

const AccountIconInner: FC<AccountIconProps> = memo(({ address, className, genesisHash, type }) => {
  if (type) {
    return (
      <AccountIconBase
        address={address}
        className={className}
        genesisHash={genesisHash}
        displayType={type}
      />
    )
  }

  return (
    <AccountIconWithSettings address={address} className={className} genesisHash={genesisHash} />
  )
})

const AccountIconFallback: FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      "block! aspect-square h-[1em] w-[1em] shrink-0 overflow-hidden rounded-full bg-body-disabled!",
      className
    )}
  ></div>
)

// suspense to prevent flickering in case settings aren't loaded yet
// ex: first account select opening in dashboard
export const AccountIcon: FC<AccountIconProps> = (props) => (
  <Suspense fallback={<AccountIconFallback className={props.className} />}>
    <AccountIconInner {...props} />
  </Suspense>
)
