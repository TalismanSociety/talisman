import type { IdenticonType } from "@core/domains/accounts/types"
import type { Address } from "@core/types/base"
import { TalismanOrb } from "@talismn/orb"
import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { useNetworkByGenesisHash } from "@ui/state/chaindata"
import { useSetting } from "@ui/state/settings"
import { cn } from "@ui/util/cn"
import { type FC, Suspense, useMemo } from "react"

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

const AccountIconInner: FC<AccountIconProps> = ({ address, className, genesisHash, type }) => {
  const [identiconType] = useSetting("identiconType")

  // apply look & feel from props if provided (should only be the case in AvatarTypeSelector)
  // fallbacks to settings store, or default talisman-orb value
  const displayType = useMemo(() => type ?? identiconType ?? "talisman-orb", [identiconType, type])

  return (
    <div className={cn("relative inline-block shrink-0", className)}>
      {displayType === "polkadot-identicon" ? (
        <PolkadotAvatar address={address} />
      ) : (
        <TalismanOrb seed={address} />
      )}
      {genesisHash && (
        <Suspense fallback={<SuspenseTracker name="AccountIconInner.Badge" />}>
          <ChainBadge genesisHash={genesisHash} />
        </Suspense>
      )}
    </div>
  )
}

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
