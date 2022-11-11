import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { Address } from "@ui/domains/Account/Address"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import useToken from "@ui/hooks/useToken"
import { FC } from "react"
import { SignParamButton } from "./SignParamButton"

type SignParamNetworkAddressButtonProps = {
  address: string
  network: EvmNetwork | CustomEvmNetwork
  className?: string
  name?: string
}

export const SignParamNetworkAddressButton: FC<SignParamNetworkAddressButtonProps> = ({
  address,
  network,
  name,
  className,
}) => {
  const nativeToken = useToken(network.nativeToken?.id)

  return (
    <SignParamButton
      explorerUrl={network.explorerUrl}
      address={address}
      iconPrefix={<TokenLogo tokenId={nativeToken?.id} />}
      withIcon
      className={className}
    >
      {name ?? <Address startCharCount={6} endCharCount={4} address={address} />}
    </SignParamButton>
  )
}
