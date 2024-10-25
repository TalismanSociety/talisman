import { classNames } from "@talismn/util"
import { UiAccountAddressType } from "extension-core"
import { FC, ReactNode, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { EthereumCircleLogo, PolkadotCircleLogo } from "@talisman/theme/logos"

const AccountTypeButton: FC<{
  title: ReactNode
  className?: string
  icon: ReactNode
  subtitle: ReactNode
  onClick: () => void
}> = ({ icon, title, subtitle, className, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={classNames(
      "bg-field hover:bg-grey-800 allow-focus flex h-32 items-center gap-6 rounded px-6 text-left",
      className,
    )}
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
        title={t("Ethereum")}
        className={classNames(
          type === "ethereum" ? "border-body" : "border-body-secondary border-opacity-20",
          "border",
        )}
        icon={<EthereumCircleLogo />}
        subtitle={t("Ethereum, Arbitrum, Moonbeam etc.")}
        onClick={handleClick("ethereum")}
      />
      <AccountTypeButton
        title={t("Polkadot")}
        className={classNames(
          type === "sr25519" ? "border-body" : "border-body-secondary border-opacity-20",
          "border",
        )}
        icon={<PolkadotCircleLogo />}
        subtitle={t(`Polkadot, Kusama & Parachains`)}
        onClick={handleClick("sr25519")}
      />
    </div>
  )
}
