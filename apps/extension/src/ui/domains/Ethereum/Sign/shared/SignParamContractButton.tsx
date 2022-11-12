import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { WithTooltip } from "@talisman/components/Tooltip"
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
      {name ? (
        <WithTooltip
          tooltip={address}
          className="inline-block max-w-[18rem] overflow-hidden text-ellipsis whitespace-nowrap"
        >
          {name}
        </WithTooltip>
      ) : (
        <Address startCharCount={6} endCharCount={4} address={address} />
      )}
    </SignParamButton>
  )
}
