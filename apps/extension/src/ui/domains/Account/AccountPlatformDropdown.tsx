import { AccountPlatform } from "@talismn/crypto"
import { isNotNil } from "@talismn/util"
import { keyBy } from "lodash-es"
import { FC, ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Dropdown } from "talisman-ui"

import { EthereumCircleLogo, PolkadotCircleLogo, SolanaLogo } from "@talisman/theme/logos"

type AccountPlatformOption = {
  value: AccountPlatform
  icon: ReactNode
  title: ReactNode
}

const ACCOUNT_PLATFORMS: AccountPlatformOption[] = [
  {
    value: "ethereum",
    icon: <EthereumCircleLogo className="text-lg" />,
    title: "Ethereum",
  },
  {
    value: "polkadot",
    icon: <PolkadotCircleLogo className="text-lg" />,
    title: "Polkadot",
  },
  {
    value: "solana",
    icon: <SolanaLogo className="text-lg" />,
    title: "Solana",
  },
]

export const AccountPlatformDropdown: FC<{
  value?: AccountPlatform
  platforms?: AccountPlatform[]
  className?: string
  onChange: (value: AccountPlatform) => void
}> = ({ value, platforms, onChange, className }) => {
  const { t } = useTranslation()

  const items = useMemo(() => {
    if (!platforms) return ACCOUNT_PLATFORMS
    // retain supplied order
    const platformsByKey = keyBy(ACCOUNT_PLATFORMS, (p) => p.value)
    return platforms.map((val) => platformsByKey[val]).filter(isNotNil)
  }, [platforms])

  const selected = useMemo(() => {
    if (!value) return null
    return items.find((item) => item.value === value) || null
  }, [items, value])

  const handleChange = (item: AccountPlatformOption | null) => {
    if (!item) return
    onChange(item.value)
  }

  return (
    <Dropdown
      propertyKey="value"
      value={selected}
      onChange={handleChange}
      items={items}
      renderItem={renderPlatform}
      className={className}
      placeholder={t("Select account platform")}
      buttonClassName="px-12"
      optionClassName="px-12"
    />
  )
}

const renderPlatform = (item: AccountPlatformOption) => (
  <div className="flex items-center gap-5">
    {item.icon}
    <span>{item.title}</span>
  </div>
)
