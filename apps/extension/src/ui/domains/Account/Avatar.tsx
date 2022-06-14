import styled from "styled-components"
import { isEthereumAddress } from "@polkadot/util-crypto/ethereum"
import { classNames } from "@talisman/util/classNames"
import ChainLogo from "../Asset/Logo"
import useChains from "@ui/hooks/useChains"
import { lazy, Suspense, useMemo } from "react"
import { TalismanOrb } from "@talisman/components/TalismanOrb"
import ethIcon from "@talisman/theme/logos/eth-diamond-glyph-white.png"
import { Address, IdenticonType } from "@core/types"
import { useSettings } from "@ui/hooks/useSettings"

const IdentIcon = lazy(() => import("@polkadot/react-identicon"))

const Container = styled.div`
  display: inline-flex;
  font-size: 3.2rem;
  width: 1em;
  height: 1em;
  position: relative;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  > div {
    width: 1em;
    height: 1em;
    border-radius: 50%;
    overflow: hidden;
    cursor: inherit;

    img,
    svg,
    div {
      line-height: 1;
      width: 1em;
      height: 1em;
    }

    .ethicon,
    .eth-badge {
      position: absolute;
      top: 15%;
      left: 15%;
      width: 70%;
      height: 70%;
      background-image: url(${ethIcon});
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      opacity: 0.8;
    }
  }

  .identicon-loader {
    background: #eee;
  }

  div.chain-logo {
    background: black;
    position: absolute;
    top: -0.1em;
    right: -0.1em;
    width: 0.5em;
    height: 0.5em;
  }
`

const ChainBadge = ({ genesisHash }: { genesisHash: string }) => {
  const chains = useChains()
  const chain = useMemo(
    () => genesisHash && (chains || []).find((c) => c.genesisHash === genesisHash),
    [chains, genesisHash]
  )

  return chain ? <ChainLogo id={chain.id} /> : null
}

const PolkadotAvatar = ({ seed }: { seed: string }) => {
  const theme = useMemo(() => (isEthereumAddress(seed) ? "ethereum" : "polkadot"), [seed])
  return (
    <Suspense fallback={<div className="identicon-loader"></div>}>
      <IdentIcon value={seed} theme={theme} />
    </Suspense>
  )
}

type AccountAvatarProps = {
  address: Address
  className?: string
  genesisHash?: string | null
  type?: IdenticonType
}

const AccountAvatar = ({ address, className, genesisHash, type }: AccountAvatarProps) => {
  const { identiconType } = useSettings()

  // apply look & feel from props if provided (should only be the case in AvatarTypeSelector)
  // fallbacks to settings store, or default talisman-orb value
  const displayType = useMemo(() => type ?? identiconType ?? "talisman-orb", [identiconType, type])

  return (
    <Container className={classNames("account-avatar", className)}>
      {displayType === "polkadot-identicon" ? (
        <PolkadotAvatar seed={address} />
      ) : (
        <TalismanOrb seed={address} />
      )}
      {genesisHash && <ChainBadge genesisHash={genesisHash} />}
    </Container>
  )
}

export default AccountAvatar
