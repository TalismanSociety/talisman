import { ProviderType } from "@core/types"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import styled from "styled-components"

type SelectionOverlayProps = {
  width: number
  left: number
}

const SelectionOverlay = styled.div<SelectionOverlayProps>`
  position: absolute;
  top: 0;
  left: ${({ left }) => left}px;
  width: ${({ width }) => width}px;
  height: 100%;
  transition: all var(--transition-speed-fast) ease-in-out;
  border-radius: var(--border-radius);
  background: var(--color-primary);
`

const Button = styled.button<{ selected?: boolean; unauthorized: boolean }>`
  outline: none;
  border: none;
  color: var(--color-mid);
  background: transparent;
  border-radius: var(--border-radius);
  padding: 0 0.5em;

  :not(:disabled) {
    cursor: pointer;

    &:hover {
      color: var(--color-foreground-muted-2x);
    }
  }

  ${({ selected }) =>
    selected
      ? `
    color: black;
    z-index:1;
  `
      : ""}

  ${({ unauthorized }) =>
    unauthorized
      ? `
    color: var(--color-background-muted-2x);
  `
      : ""}
`

const Container = styled.div`
  background: var(--color-background-muted-3x);
  padding: 0.4rem;
  display: inline-block;
  border-radius: var(--border-radius);

  > div {
    position: relative;
    display: inline-flex;
    gap: -0.5em;

    line-height: 1.6em;
  }
`

type ProviderSwitchProps = {
  defaultProvider?: ProviderType
  authorizedProviders?: ProviderType[]
  onChange?: (provider: ProviderType) => void
}

const DEFAULT_PROVIDERS: ProviderType[] = ["polkadot", "ethereum"]

export const ProviderTypeSwitch = ({
  defaultProvider = "polkadot",
  authorizedProviders = DEFAULT_PROVIDERS,
  onChange,
}: ProviderSwitchProps) => {
  const [selected, setSelected] = useState<ProviderType>(defaultProvider)
  const refPolkadot = useRef<HTMLButtonElement>(null)
  const refEthereum = useRef<HTMLButtonElement>(null)

  const [selectionOverlay, setSelectionOverlay] = useState<SelectionOverlayProps>({
    left: 0,
    width: 0,
  })

  const buttonProps = useMemo(
    () => ({
      polkadot: {
        selected: selected === "polkadot",
        disabled: !authorizedProviders.includes("polkadot") || selected === "polkadot",
        unauthorized: !authorizedProviders.includes("polkadot"),
      },
      ethereum: {
        selected: selected === "ethereum",
        disabled: !authorizedProviders.includes("ethereum") || selected === "ethereum",
        unauthorized: !authorizedProviders.includes("ethereum"),
      },
    }),
    [authorizedProviders, selected]
  )

  useEffect(() => {
    if (!refPolkadot.current || !refEthereum.current) return
    let button: HTMLButtonElement | null = null
    switch (selected) {
      case "polkadot":
        button = refPolkadot.current
        break
      case "ethereum":
        button = refEthereum.current
        break
    }
    setSelectionOverlay({
      left: button?.offsetLeft || 0,
      width: button?.offsetWidth || 0,
    })
  }, [selected])

  const handleChange = useCallback(
    (provider: ProviderType) => () => {
      setSelected(provider)
      if (onChange) onChange(provider)
    },
    [onChange]
  )

  return (
    <Container>
      <div>
        <Button ref={refPolkadot} {...buttonProps.polkadot} onClick={handleChange("polkadot")}>
          Polkadot
        </Button>
        <Button ref={refEthereum} {...buttonProps.ethereum} onClick={handleChange("ethereum")}>
          Ethereum
        </Button>
        <SelectionOverlay {...selectionOverlay} />
      </div>
    </Container>
  )
}
