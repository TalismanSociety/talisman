import { NetworkPlatform } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { FC, useCallback, useState } from "react"
import { Dropdown } from "talisman-ui"

type NetworkPlatformOption = {
  value: NetworkPlatform
  label: string
}

const OPTIONS: NetworkPlatformOption[] = [
  { value: "polkadot", label: "Polkadot" },
  { value: "ethereum", label: "Ethereum" },
]

export const PlatformSelect: FC<{
  value: NetworkPlatform | null
  placeholder?: string
  className?: string
  onChange: (platform: NetworkPlatform) => void
}> = ({ value, placeholder, className, onChange }) => {
  const [selected, setSelected] = useState<NetworkPlatform | null>(value)

  const handleChange = useCallback(
    (item: NetworkPlatformOption | null) => {
      if (!item) return
      setSelected(item.value)
      if (onChange) onChange(item.value)
    },
    [onChange],
  )

  return (
    <Dropdown
      items={OPTIONS}
      propertyKey="value"
      placeholder={placeholder}
      renderItem={(p) => p.label}
      value={OPTIONS.find((opt) => opt.value === selected) || null}
      onChange={handleChange}
      className={classNames("[&>div>button]:h-[4.6rem]", className)}
    />
  )
}
