import { AccountPlatform } from "@talismn/crypto"
import { classNames } from "@talismn/util"
import { FC, ReactNode, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { EthereumCircleLogo, PolkadotCircleLogo, SolanaLogo } from "@talisman/theme/logos"

const AccountTypeButton: FC<{
  className?: string
  icon: ReactNode
  title: ReactNode
  subtitle: ReactNode
  disabled?: boolean
  onClick: () => void
}> = ({ className, icon, title, subtitle, disabled, onClick }) => (
  <button
    type="button"
    className={classNames(
      "bg-field allow-focus flex h-32 items-center gap-6 rounded px-6 text-left",
      disabled && "text-body-secondary opacity-40",
      !disabled && "hover:bg-grey-800",
      className,
    )}
    disabled={disabled}
    onClick={onClick}
  >
    <div className="text-xl">{icon}</div>
    <div className="flex flex-grow flex-col justify-center gap-2">
      <div className="text-body text-base">{title}</div>
      <div className="text-body-secondary text-xs">{subtitle}</div>
    </div>
  </button>
)

type AccountPlatformSelectorProps = {
  defaultValue?: AccountPlatform
  onChange: (value: AccountPlatform) => void
  className?: string
}

export const AccountPlatformSelector = ({
  defaultValue: defaultType,
  onChange,
  className,
}: AccountPlatformSelectorProps) => {
  const { t } = useTranslation()
  const [platform, setPlatform] = useState<AccountPlatform | undefined>(defaultType)

  const handleClick = (value: AccountPlatform) => () => {
    setPlatform(value)
  }

  useEffect(() => {
    if (onChange && platform) onChange(platform)
  }, [onChange, platform])

  return (
    <div className={classNames("grid w-full grid-cols-2 gap-10", className)}>
      <AccountTypeButton
        className={classNames(
          platform === "ethereum" ? "border-body" : "border-body-secondary border-opacity-20",
          "border",
        )}
        icon={<EthereumCircleLogo />}
        title={t("Ethereum")}
        subtitle={
          <div className="line-clamp-2" data-testid="account-platform-selector-ethereum">
            {t("Ethereum, Base, zkSync, Arbitrum, BSC, and all EVM chains")}
          </div>
        }
        onClick={handleClick("ethereum")}
      />
      <AccountTypeButton
        className={classNames(
          platform === "polkadot" ? "border-body" : "border-body-secondary border-opacity-20",
          "border",
        )}
        icon={<PolkadotCircleLogo />}
        title={t("Polkadot")}
        subtitle={
          <div className="line-clamp-2" data-testid="account-platform-selector-polkadot">
            {t("Relay Chain, Asset Hub, Bittensor, and most Polkadot chains")}
          </div>
        }
        onClick={handleClick("polkadot")}
      />
      <AccountTypeButton
        className={classNames(
          platform === "solana" ? "border-body" : "border-body-secondary border-opacity-20",
          "border",
        )}
        icon={<SolanaLogo />}
        title={t("Solana")}
        subtitle={
          <div className="line-clamp-2" data-testid="account-platform-selector-solana">
            {t("Solana Mainnet and testnets")}
          </div>
        }
        onClick={handleClick("solana")}
      />
    </div>
  )
}
