import { CustomEvmNetwork, EvmNetwork } from "@core/types"
import { Dropdown } from "@talisman/components/Dropdown"
import { useSortedEvmNetworks } from "@ui/hooks/useSortedEvmNetworks"
import { useCallback, useEffect, useState } from "react"
import styled from "styled-components"
import { NetworkLogo } from "./NetworkLogo"

const NetworkItem = styled.div`
  display: flex;
  gap: 1.2rem;
`

type NetworkSelectProps = {
  placeholder?: string
  defaultChainId?: number
  onChange?: (chainId: number) => void
  disabled?: boolean
}

const renderNetwork = (network: EvmNetwork | CustomEvmNetwork) => {
  return (
    <NetworkItem>
      <NetworkLogo ethChainId={network.id} />
      <span>{network.name}</span>
    </NetworkItem>
  )
}

export const NetworkSelect = ({
  placeholder,
  defaultChainId,
  onChange,
  disabled,
}: NetworkSelectProps) => {
  const networks = useSortedEvmNetworks()
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
      key={selected?.id}
      items={networks}
      propertyKey="id"
      renderItem={renderNetwork}
      defaultSelectedItem={selected}
      onChange={handleChange}
      disabled={disabled}
    />
  )
}
