import { ChevronDownIcon, XIcon } from "@talisman/theme/icons"
import { scrollbarsStyle } from "@talisman/theme/styles"
import { classNames } from "@talismn/util"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { NetworkOption, usePortfolio } from "@ui/domains/Portfolio/context"
import { UseComboboxState, UseComboboxStateChangeOptions, useCombobox } from "downshift"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import styled, { css } from "styled-components"

const Container = styled.div<{ isOpen?: boolean; disabled?: boolean }>`
  .network-main,
  ul {
    border: 1px solid transparent;
  }
  ul {
    display: none;
  }

  .network-main {
    box-sizing: content-box;
  }
  :not(.select-disabled):active,
  :not(.select-disabled):focus-within {
    .network-main {
      background-color: var(--color-background-muted-3x);
    }
    .network-main {
      border: 1px solid var(--color-background-muted-2x);
    }
  }

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

  input::placeholder {
    opacity: 1;
  }
  input:focus::placeholder {
    opacity: 0.5;
  }

  button {
    background: transparent;
    color: var(--color-mid);
    border: none;

    padding: 0 0.4rem;
    height: 100%;
    font-size: 2.4rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0 0.8rem;

    ${({ disabled }) =>
      disabled
        ? ""
        : css`
            cursor: pointer;
            :hover {
              color: var(--color-foreground-muted);
            }
          `}
  }

  ul {
    z-index: 1;
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
    background-color: var(--color-background-muted);

    ${scrollbarsStyle("var(--color-background-muted-2x)")};
  }
  li {
    margin: 0;
    padding: 0;
    cursor: pointer;
  }

  > div {
    border-radius: var(--border-radius);
  }

  .chain-logo {
    font-size: 2.4rem;
  }

  &.select-open {
    ul {
      border: 1px solid var(--color-background-muted-2x);
    }
    /* .network-main {
      border-bottom: none;
    } */
    ul {
      border-top: none;
      display: block;
    }

    > div {
      border-bottom-right-radius: 0;
      border-bottom-left-radius: 0;
    }
  }

  &.select-disabled {
    opacity: 0.5;
    cursor: not-allowed;
    button,
    input::placeholder {
      opacity: 0.5;
    }
    button,
    input {
      cursor: not-allowed;
    }
  }
`

const itemToString = (blockchain: NetworkOption | null | undefined) => blockchain?.name ?? ""

const filterItems = (inputValue?: string) => (bc: NetworkOption | undefined) => {
  try {
    const test = inputValue?.toLowerCase() ?? ""
    return (
      !inputValue ||
      !!bc?.name.toLowerCase().includes(test) ||
      !!bc?.symbols?.some((s) => s.toLowerCase().includes(test))
    )
  } catch (err) {
    // ignore
    return false
  }
}

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
        case useCombobox.stateChangeTypes.InputBlur: {
          const itemToSelect =
            state.isOpen && state.inputValue ? items[state.highlightedIndex] : undefined

          return {
            ...changes,
            inputValue: itemToSelect ? itemToString(itemToSelect) : "",
            selectedItem: itemToSelect,
          }
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

  const disabled = useMemo(() => !networks?.length, [networks?.length])

  useEffect(() => {
    // when user changes account, if selected network isn't in the list anymore, clear
    if (selectedItem?.id && !networks?.some(({ id }) => id === selectedItem.id))
      selectItem(undefined)
  }, [networks, selectItem, selectedItem])

  const { t } = useTranslation("portfolio")

  return (
    <Container
      className={classNames(isOpen && "select-open", disabled && "select-disabled")}
      isOpen={isOpen}
      disabled={disabled}
    >
      <div
        className="bg-black-secondary network-main flex w-[30rem] items-center gap-1"
        align="center"
        {...getComboboxProps()}
      >
        <div className="flex h-24 w-full items-center gap-4 overflow-hidden pl-6">
          {networkFilter ? (
            <div>
              <ChainLogo id={networkFilter.id} />
            </div>
          ) : null}
          <input
            spellCheck="false"
            lp-ignore="true"
            placeholder={t("All networks")}
            disabled={disabled}
            {...getInputProps()}
          />
          {inputValue ? (
            <button disabled={disabled} aria-label={t("Clear")} type="button" onClick={handleClear}>
              <XIcon />
            </button>
          ) : (
            <button
              disabled={disabled}
              aria-label={t("Toggle menu")}
              type="button"
              {...getToggleButtonProps()}
            >
              <ChevronDownIcon />
            </button>
          )}
        </div>
      </div>
      <ul {...getMenuProps()}>
        {isOpen &&
          (items.length ? (
            items.map((item, index) => (
              <li key={`${item.id}${index}`} {...getItemProps({ item, index })}>
                <div
                  className={classNames(
                    "text-body-secondary flex h-[4.2rem] w-full items-center gap-6 px-6",
                    highlightedIndex === index ? "bg-grey-800" : "bg-black-secondary"
                  )}
                >
                  <div>
                    <ChainLogo id={item?.id} />
                  </div>
                  <div>{item.name}</div>
                </div>
              </li>
            ))
          ) : (
            <li>
              <div className="text-body-secondary p-8 text-sm">{t("No network found")}</div>
            </li>
          ))}
      </ul>
    </Container>
  )
}
