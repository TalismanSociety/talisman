import { EthereumNetwork } from "@core/types"
import { Dropdown } from "@talisman/components/Dropdown"
import { useEthereumNetworks } from "@ui/hooks/useEthereumNetworks"
import { useCallback, useEffect, useState } from "react"
import styled from "styled-components"
import globeIcon from "@talisman/theme/icons/globe.white.svg"

const NetworkItem = styled.div`
  display: flex;
  gap: 1.2rem;

  img,
  picture {
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 50%;
  }
`

type NetworkSelectProps = {
  defaultChainId: number
  onChange: (chainId: number) => void
}

const renderNetwork = (network: EthereumNetwork) => {
  return (
    <NetworkItem>
      <picture>
        {network.iconUrls.map((url, i) => (
          <source key={i} srcSet={url} />
        ))}
        <img src={globeIcon} alt="" />
      </picture>
      <span>{network.name}</span>
    </NetworkItem>
  )
}

export const NetworkSelect = ({ defaultChainId, onChange }: NetworkSelectProps) => {
  const networks = useEthereumNetworks()

  const [selected, setSelected] = useState<EthereumNetwork | undefined>(
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
    (item: EthereumNetwork | null) => {
      if (!item) return
      setSelected(item)
      onChange(item.id)
    },
    [onChange]
  )

  return (
    <Dropdown
      // change key to ensure re-render when loaded
      key={selected?.id}
      items={networks}
      propertyKey="id"
      renderItem={renderNetwork}
      defaultSelectedItem={selected}
      onChange={handleChange}
    />
  )
}
