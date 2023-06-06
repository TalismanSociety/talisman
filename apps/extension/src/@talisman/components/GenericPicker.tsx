import { TokenId } from "@core/domains/tokens/types"
import { scrollbarsStyle } from "@talisman/theme/styles"
import { classNames } from "@talismn/util"
import Downshift from "downshift"
import { ReactNode, forwardRef, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import styled from "styled-components"

const Container = styled.div`
  position: relative;
  display: inline-block;

  .btn-picker-select {
    background: transparent;
    border: none;
    padding: 0;
  }
  .btn-picker-select:hover .picker-item-container {
    color: var(--color-foreground-muted-2x);
  }

  .picker-dropdown {
    z-index: 1;
    display: flex;
    flex-direction: column;
    background: var(--color-background);
    border: 1px solid var(--color-background-muted);
    border-radius: var(--border-radius);
    position: absolute;
    top: -0.8rem;
    opacity: 0;
    transition: opacity var(--transition-speed) ease-in-out;
  }
  .picker-dropdown.mounted {
    opacity: 1;
  }

  .picker-search-container {
    padding: 0 1rem 1rem;
  }

  .picker-search {
    background: var(--color-background-muted);
    border: none;
    border-radius: var(--border-radius);
    outline: none;
    font-size: 3.2rem;
    font-weight: var(--font-weight-regular);
    line-height: 3.2rem;
    display: inline-block;
    color: var(--color-mid);
    min-width: 0;
    width: 21rem;
    padding: 1.1rem 2rem;
    font-size: 1.8rem;
    line-height: 1.8rem;
  }

  .picker-items {
    max-height: 25rem;
    overflow-y: auto;
    padding: 0;
    margin: 0;
    border-radius: 0 0 var(--border-radius) var(--border-radius);

    min-width: 100%;

    ${scrollbarsStyle()}

    li {
      padding: 0.6rem 1.2rem;
      line-height: 1;
      display: flex;

      .picker-item-container {
        width: 100%;
      }
    }
    li[aria-selected="true"] {
      background: var(--color-background-muted-3x);
    }
  }

  .picker-item-container {
    display: inline-flex;
    border: none;
    gap: 0.8rem;
    align-items: center;
    color: var(--color-mid);
    cursor: pointer;
  }

  .picker-item-container.item-with-subtitle {
    .picker-item-main {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
    }
    .picker-item-title {
      font-size: var(--font-size-medium);
      line-height: 1;
    }
    .picker-item-subtitle {
      font-size: var(--font-size-xsmall);
      color: var(--color-mid);
      line-height: 1;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }
`

type DivWithMountProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>

// Purpose of this custom <div> component is just to have a .mounted class right after it's mounted, to use a CSS transition
// Downshift uses the ref, need to forward it
const DivWithMount = forwardRef<HTMLDivElement, DivWithMountProps>(
  ({ children, className, ...props }: DivWithMountProps, ref) => {
    const [isMounted, setIsMounted] = useState(false)
    useEffect(() => setIsMounted(true), [])
    return (
      <div ref={ref} className={classNames(className, isMounted && "mounted")} {...props}>
        {children}
      </div>
    )
  }
)
DivWithMount.displayName = "DivWithMount"

type PickerItemId = string

export type PickerItemProps = {
  id: PickerItemId
  logo?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
}

const PickerItem = ({ logo, title, subtitle }: PickerItemProps) => {
  return (
    <span className={classNames("picker-item-container", !!subtitle && "item-with-subtitle")}>
      {!!logo && <span className="picker-item-logo">{logo}</span>}
      <span className={"picker-item-main"}>
        <span className="picker-item-title">{title}</span>
        {subtitle && <span className="picker-item-subtitle">{subtitle}</span>}
      </span>
    </span>
  )
}

// prevents searchbox to be filled with item.toString() when we select one
// we want to keep this an empty string to allow for a quick search without clearing the field
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handleItemToString = (tokenId?: TokenId | null) => ""

const DEFAULT_SEARCH = (text: string | null, items: PickerItemProps[]) => {
  if (!text) return items
  const ls = text.toLowerCase()
  return items.filter(
    (item) =>
      item.title?.toString().toLowerCase().includes(ls) ||
      (typeof item.subtitle === "string" && item.subtitle.toLowerCase().includes(ls))
  )
}

type GenericPickerProps = {
  items: PickerItemProps[]
  defaultValue?: PickerItemId
  value?: PickerItemId
  onChange?: (id: PickerItemId) => void
  className?: string
  search?: (text: string | null, items: PickerItemProps[]) => PickerItemProps[]
}

const GenericPicker = ({
  items,
  defaultValue,
  value,
  onChange,
  className,
  search = DEFAULT_SEARCH,
}: GenericPickerProps) => {
  const [selectedItemId, setSelectedItemId] = useState<PickerItemId>(
    // this is bad to hardcode but balances may not be loaded yet
    () => value ?? defaultValue ?? items[0]?.id
  )
  const selectedItem = useMemo(
    () => items?.find((item) => item.id === selectedItemId),
    [items, selectedItemId]
  )

  // select first available entry if needed
  useEffect(() => {
    if (selectedItemId === undefined && items.length > 0) {
      setSelectedItemId(items[0].id)
    }
  }, [items, selectedItemId])

  // trigger parent's onChange
  useEffect(() => {
    if (!onChange || !selectedItemId) return
    if (value && value === selectedItemId) return
    onChange(selectedItemId)
  }, [onChange, selectedItemId, value])

  const handleChange = useCallback((itemId?: PickerItemId | null) => {
    if (itemId) setSelectedItemId(itemId)
  }, [])

  // returns the list of entries to display in the combo box, filtered by user input
  const searchItems = useCallback((text: string | null) => search(text, items), [items, search])

  const { t } = useTranslation()

  return (
    <Downshift onChange={handleChange} itemToString={handleItemToString}>
      {({
        getInputProps,
        getItemProps,
        isOpen,
        inputValue,
        getToggleButtonProps,
        getMenuProps,
        getRootProps,
      }) => (
        <Container className={className} {...getRootProps()}>
          {isOpen && (
            <DivWithMount className="picker-dropdown" {...getMenuProps()}>
              <div className="picker-search-container">
                <input
                  className="picker-search"
                  placeholder={t("Search")}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  {...getInputProps()}
                />
              </div>
              <ul className="picker-items">
                {searchItems(inputValue).map((item, index) => (
                  // eslint-disable-next-line react/jsx-key
                  <li
                    className="picker-item-item"
                    {...getItemProps({
                      key: item.id,
                      index,
                      item: item.id,
                    })}
                  >
                    <PickerItem {...item} />
                  </li>
                ))}
              </ul>
            </DivWithMount>
          )}
          <button
            className="btn-picker-select"
            aria-label={t("Select")}
            {...getToggleButtonProps()}
          >
            {/* key is there to force rerender in case of missing logo */}
            {selectedItem && (
              <PickerItem key={selectedItem?.id ?? "EMPTY"} {...(selectedItem ?? {})} />
            )}
          </button>
        </Container>
      )}
    </Downshift>
  )
}

export default GenericPicker
