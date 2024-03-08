import { CustomEvmNetwork, EvmNetwork, EvmNetworkId } from "@extension/core"
import { useSortedEvmNetworks } from "@ui/hooks/useSortedEvmNetworks"
import { useCallback, useEffect, useState } from "react"
import { Dropdown } from "talisman-ui"

import { NetworkLogo } from "./NetworkLogo"

type NetworkSelectProps = {
  placeholder?: string
  defaultChainId?: EvmNetworkId
  onChange?: (chainId: EvmNetworkId) => void
  disabled?: boolean
  className?: string
  withTestnets: boolean
}

const renderNetwork = (network: EvmNetwork | CustomEvmNetwork) => {
  return (
    <div className="flex items-center gap-5">
      <NetworkLogo ethChainId={network.id} className="text-[1.25em]" />
      <span>{network.name}</span>
    </div>
  )
}

export const NetworkSelect = ({
  placeholder,
  defaultChainId,
  onChange,
  disabled,
  className,
  withTestnets,
}: NetworkSelectProps) => {
  const networks = useSortedEvmNetworks(withTestnets)
  const [selected, setSelected] = useState<EvmNetwork | CustomEvmNetwork | undefined>(
    networks.find((n) => n.id === defaultChainId)
  )

  useEffect(() => {
    // networks may not be loaded on first render
    // handle default selection here
    if (!selected) {
      const defaultNetwork = networks.find((n) => n.id === defaultChainId)
      if (defaultNetwork) setSelected(defaultNetwork)
    }
  }, [defaultChainId, networks, selected])

  const handleChange = useCallback(
    (item: EvmNetwork | CustomEvmNetwork | null) => {
      if (!item) return
      setSelected(item)
      if (onChange) onChange(item.id)
    },
    [onChange]
  )

  return (
    <Dropdown
      // change key to ensure re-render when loaded
      placeholder={placeholder}
      items={networks}
      propertyKey="id"
      renderItem={renderNetwork}
      value={selected}
      onChange={handleChange}
      disabled={disabled}
      className={className}
    />
  )
}
