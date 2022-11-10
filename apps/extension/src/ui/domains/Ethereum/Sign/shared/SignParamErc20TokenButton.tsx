import { BalanceFormatter } from "@core/domains/balances"
import { CustomEvmNetwork, EvmNetwork } from "@core/domains/ethereum/types"
import { Erc20Token, Token } from "@core/domains/tokens/types"
import { WithTooltip } from "@talisman/components/Tooltip"
import { Address } from "@ui/domains/Account/Address"
import AccountAvatar from "@ui/domains/Account/Avatar"
import Fiat from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import Tokens from "@ui/domains/Asset/Tokens"
import { AssetBalanceCellValue } from "@ui/domains/Portfolio/AssetBalanceCellValue"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { FC } from "react"
import { classNames } from "talisman-ui"
import { SignParamButton, SignParamButtonProps } from "./SignParamButton"

type SignParamErc20TokenButtonProps = {
  network: EvmNetwork | CustomEvmNetwork
  asset: { name: string; symbol: string; decimals: number }
  address: string
  withIcon?: boolean
  className?: string
}

export const SignParamErc20TokenButton: FC<SignParamErc20TokenButtonProps> = ({
  address,
  network,
  withIcon,
  asset,
  className,
}) => {
  return (
    <SignParamButton
      explorerUrl={network.explorerUrl}
      address={address}
      withIcon={withIcon}
      className={classNames(
        "text-body-secondary inline-flex items-start gap-3 px-4 text-base",
        className
      )}
      iconPrefix={<TokenLogo />}
    >
      <span>{asset.symbol}</span>
    </SignParamButton>
  )
}
