import { Address } from "@extension/core"
import { IdenticonType } from "@extension/core"
import { TalismanOrb } from "@talismn/orb"
import { classNames, isEthereumAddress } from "@talismn/util"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import { useSetting } from "@ui/hooks/useSettings"
import { CSSProperties, FC, Suspense, lazy, useMemo } from "react"

import { ChainLogo } from "../Asset/ChainLogo"

const IdentIcon = lazy(() => import("@polkadot/react-identicon"))

const IDENTICON_STYLE: CSSProperties = { cursor: "inherit" }

type AccountIconProps = {
  address: Address
  className?: string
  genesisHash?: string | null
  type?: IdenticonType
}

const ChainBadge = ({ genesisHash }: { genesisHash: string }) => {
  const chain = useChainByGenesisHash(genesisHash)

  return chain ? (
    <ChainLogo
      id={chain.id}
      className="bg-grey-800 !absolute right-[-0.2em] top-[-0.2em] rounded-full text-[0.5em]"
    />
  ) : null
}

const PolkadotAvatar = ({ seed }: { seed: string }) => {
  const theme = useMemo(() => (isEthereumAddress(seed) ? "ethereum" : "polkadot"), [seed])
  return (
    <IdentIcon
      value={seed}
      theme={theme}
      className="!block overflow-hidden rounded-full [&>img]:h-[1em] [&>img]:w-[1em]"
      style={IDENTICON_STYLE}
    />
  )
}

const AccountIconInner: FC<AccountIconProps> = ({ address, className, genesisHash, type }) => {
  const [identiconType] = useSetting("identiconType")

  // apply look & feel from props if provided (should only be the case in AvatarTypeSelector)
  // fallbacks to settings store, or default talisman-orb value
  const displayType = useMemo(() => type ?? identiconType ?? "talisman-orb", [identiconType, type])

  return (
    <div className={classNames("relative inline-block shrink-0", className)}>
      {displayType === "polkadot-identicon" ? (
        <PolkadotAvatar seed={address} />
      ) : (
        <TalismanOrb seed={address} />
      )}
      {genesisHash && (
        <Suspense>
          <ChainBadge genesisHash={genesisHash} />
        </Suspense>
      )}
    </div>
  )
}

const AccountIconFallback: FC<{ className?: string }> = ({ className }) => (
  <div
    className={classNames(
      "!bg-body-disabled !block h-[1em] w-[1em] shrink-0 overflow-hidden rounded-full",
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
