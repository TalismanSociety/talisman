import { classNames } from "@talismn/util"
import { UiAccountAddressType } from "extension-core"
import { FC, ReactNode, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { EthereumCircleLogo, PolkadotCircleLogo } from "@talisman/theme/logos"

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

type AccountTypeSelectorProps = {
  defaultType?: UiAccountAddressType
  onChange: (type: UiAccountAddressType) => void
  className?: string
}

export const AccountTypeSelector = ({
  defaultType,
  onChange,
  className,
}: AccountTypeSelectorProps) => {
  const { t } = useTranslation()
  const [type, setType] = useState<UiAccountAddressType | undefined>(defaultType)

  const handleClick = (type: UiAccountAddressType) => () => {
    setType(type)
  }

  useEffect(() => {
    if (onChange && type) onChange(type)
  }, [onChange, type])

  return (
    <div className={classNames("grid w-full grid-cols-2 gap-10", className)}>
      <AccountTypeButton
        className={classNames(
          type === "ethereum" ? "border-body" : "border-body-secondary border-opacity-20",
          "border",
        )}
        icon={<EthereumCircleLogo />}
        title={t("Ethereum")}
        subtitle={
          <div className="line-clamp-2">
            {t("Ethereum, Base, zkSync, Arbitrum, BSC, and all EVM chains")}
          </div>
        }
        onClick={handleClick("ethereum")}
      />
      <AccountTypeButton
        className={classNames(
          type === "sr25519" ? "border-body" : "border-body-secondary border-opacity-20",
          "border",
        )}
        icon={<PolkadotCircleLogo />}
        title={t("Polkadot")}
        subtitle={
          <div className="line-clamp-2">
            {t("Relay Chain, Asset Hub, Bittensor, and most Polkadot chains")}
          </div>
        }
        onClick={handleClick("sr25519")}
      />
    </div>
  )
}
