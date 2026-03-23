import type { NetworkPlatform } from "@talismn/chaindata-provider"
import { Dropdown } from "@ui/components/Dropdown"
import { cn } from "@ui/util/cn"
import { type FC, useCallback, useState } from "react"

type NetworkPlatformOption = {
  value: NetworkPlatform
  label: string
}

const OPTIONS: NetworkPlatformOption[] = [
  { value: "polkadot", label: "Substrate" },
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
    [onChange]
  )

  return (
    <Dropdown
      items={OPTIONS}
      propertyKey="value"
      placeholder={placeholder}
      renderItem={(p) => p.label}
      value={OPTIONS.find((opt) => opt.value === selected) || null}
      onChange={handleChange}
      className={cn("[&>div>button]:h-11.5", className)}
    />
  )
}
