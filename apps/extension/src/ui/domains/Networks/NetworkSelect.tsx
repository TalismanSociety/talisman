import { Network, NetworkId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { FC, useCallback, useEffect, useState } from "react"
import { Dropdown } from "talisman-ui"

import { NetworkLogo } from "./NetworkLogo"

const renderNetwork = (network: Network) => {
  return (
    <div className="flex items-center gap-5">
      <NetworkLogo networkId={network.id} className="text-[1.25em]" />
      <span>{network.name}</span>
    </div>
  )
}

// TODO rewrite as combobox, it's painful to use if list is long
export const NetworkSelect: FC<{
  networks: Network[]
  selectedId: NetworkId | null
  placeholder?: string
  className?: string
  onChange: (networkId: NetworkId) => void
}> = ({ networks, selectedId, placeholder, className, onChange }) => {
  const [selected, setSelected] = useState<Network | undefined>(
    networks.find((n) => n.id === selectedId),
  )

  useEffect(() => {
    // networks may not be loaded on first render
    // handle default selection here
    if (!selected) {
      const defaultNetwork = networks.find((n) => n.id === selectedId)
      if (defaultNetwork) setSelected(defaultNetwork)
    } else if (selectedId !== selected.id) {
      const newSelected = networks.find((n) => n.id === selectedId)
      if (newSelected) {
        setSelected(newSelected)
      } else {
        setSelected(undefined)
      }
    }
  }, [selectedId, networks, selected])

  const handleChange = useCallback(
    (item: Network | null) => {
      if (!item) return
      setSelected(item)
      if (onChange) onChange(item.id)
    },
    [onChange],
  )

  return (
    <Dropdown
      items={networks}
      propertyKey="id"
      placeholder={placeholder}
      renderItem={renderNetwork}
      value={selected}
      onChange={handleChange}
      className={classNames("[&>div>button]:h-[4.6rem]", className)}
    />
  )
}
