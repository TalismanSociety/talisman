import { Box } from "@talisman/components/Box"
import { ChevronDownIcon, XIcon } from "@talisman/theme/icons"
import { NetworkOption, usePortfolio } from "@ui/domains/Portfolio/context"
import { useCombobox, UseComboboxState, UseComboboxStateChangeOptions } from "downshift"
import { useCallback, useEffect, useState } from "react"
import styled from "styled-components"
import StyledAssetLogo from "../Asset/Logo"

const Container = styled.div<{ isOpen?: boolean }>`
  display: inline-block;
  position: relative;

  input {
    background: transparent;
    color: var(--color-mid);
    border: none;
    flex-grow: 1;
    padding: 0;
    min-width: 0;
    padding: 0;
  }

  button {
    background: transparent;
    color: var(--color-mid);
    border: none;
    cursor: pointer;
    padding: 0 0.4rem;
    height: 100%;
    font-size: 2.4rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    :hover {
      color: var(--color-foreground-muted);
    }
    padding: 0 0.8rem;
  }

  ul {
    position: absolute;
    top: 4.8rem;
    left: 0;
    width: 100%;
    margin: 0;
    padding: 0;
    max-height: 24rem;
    overflow-y: auto;
    border-bottom-right-radius: var(--border-radius);
    border-bottom-left-radius: var(--border-radius);
  }
  li {
    margin: 0;
    padding: 0;
    cursor: pointer;
  }

  > div {
    border-radius: var(--border-radius);
    ${({ isOpen }) =>
      isOpen &&
      `
          border-bottom-right-radius: 0;
          border-bottom-left-radius: 0;
      `}
  }

  .chain-logo {
    font-size: 2.4rem;
  }
`

const itemToString = (blockchain: NetworkOption | null | undefined) => blockchain?.name ?? ""

const filterItems = (inputValue?: string) => (bc: NetworkOption | undefined) =>
  !inputValue || bc?.name.toLowerCase().includes(inputValue.toLowerCase())

export const NetworkPicker = () => {
  const { networks, networkFilter, setNetworkFilter } = usePortfolio()
  const [defaultSelectedItem] = useState(networkFilter)
  const [items, setItems] = useState(networks)

  useEffect(() => {
    setItems(networks)
  }, [networks])

  // autocomplete behavior
  const stateReducer = useCallback(
    (
      state: UseComboboxState<NetworkOption | undefined>,
      actionAndChanges: UseComboboxStateChangeOptions<NetworkOption | undefined>
    ) => {
      const { type, changes } = actionAndChanges
      switch (type) {
        case useCombobox.stateChangeTypes.InputKeyDownEnter:
        case useCombobox.stateChangeTypes.InputBlur:
          const visibleItems = items.filter(filterItems(state.inputValue))
          const itemToSelect = state.isOpen && state.inputValue ? visibleItems[0] : undefined
          return {
            ...changes,
            inputValue: itemToSelect ? itemToString(itemToSelect) : "",
            selectedItem: itemToSelect,
          }
        default:
          return changes // otherwise business as usual.
      }
    },
    [items]
  )

  const {
    isOpen,
    getToggleButtonProps,
    getMenuProps,
    getInputProps,
    getComboboxProps,
    highlightedIndex,
    getItemProps,
    selectedItem,
    inputValue,
    selectItem,
  } = useCombobox<NetworkOption | undefined>({
    onInputValueChange({ inputValue }) {
      setItems(networks.filter(filterItems(inputValue)))
    },
    items,
    itemToString,
    stateReducer,
    defaultSelectedItem,
  })

  useEffect(() => {
    setNetworkFilter(selectedItem ?? undefined)
  }, [selectedItem, setNetworkFilter])

  const handleClear = useCallback(() => {
    selectItem(undefined)
  }, [selectItem])

  return (
    <Container isOpen={isOpen}>
      <Box flex gap={1} width={30} bg="background-muted" align="center" {...getComboboxProps()}>
        <Box height={4.8} flex fullwidth align="center" padding="0 0 0 1.2rem">
          {networkFilter ? (
            <Box margin="0 1.2rem 0 0">
              <StyledAssetLogo id={networkFilter?.logoId} />
            </Box>
          ) : null}
          <input
            spellCheck="false"
            lp-ignore="true"
            placeholder="All networks"
            {...getInputProps()}
          />
          {inputValue ? (
            <button aria-label="clear" type="button" onClick={handleClear}>
              <XIcon />
            </button>
          ) : (
            <button aria-label="toggle menu" type="button" {...getToggleButtonProps()}>
              <ChevronDownIcon />
            </button>
          )}
        </Box>
      </Box>
      <ul {...getMenuProps()}>
        {isOpen &&
          items.map((item, index) => (
            <li key={`${item.id}${index}`} {...getItemProps({ item, index })}>
              <Box
                flex
                height={4.2}
                fullwidth
                bg={highlightedIndex === index ? "background-muted-3x" : "background-muted"}
                fg="mid"
                align="center"
                gap={1.2}
                padding="0 1.2rem"
              >
                <Box>
                  <StyledAssetLogo id={item?.logoId} />
                </Box>
                <Box>{item.name}</Box>
              </Box>
            </li>
          ))}
      </ul>
    </Container>
  )
}
