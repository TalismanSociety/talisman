import { ChevronDownIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import { useSelect } from "downshift"
import { useEffect } from "react"
import styled from "styled-components"

const Container = styled.div`
  position: relative;
  display: inline-block;

  button {
    border: none;
    outline: none;
    border-radius: var(--border-radius-tiny);
    background-color: var(--color-background-muted-3x);
    display: flex;
    align-items: center;
    padding: 1.6rem;
    gap: 1.6rem;
    line-height: 1;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    max-width: 100%;
    width: 30rem;

    .grow {
      flex-grow: 1;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    > span,
    > span * {
      line-height: 1;
      max-height: 1.6rem;
    }

    color: var(--color-mid);
    &.hasValue {
      color: var(--color-foreground-muted-2x);
    }
    :hover {
      color: var(--color-foreground);
    }
    :disabled {
      background-color: var(--color-background-muted);
      color: var(--color-mid);
      cursor: not-allowed;
    }

    &[aria-expanded="true"] {
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }
  }

  > ul {
    padding: 0.8rem;
    z-index: 1;
    position: absolute;
    top: 4.8rem;
    left: 0;
    width: 100%;
    border-bottom-left-radius: var(--border-radius-tiny);
    border-bottom-right-radius: var(--border-radius-tiny);
    overflow: hidden;
    opacity: 0;
    transition: opacity 0.2s ease-in-out;

    margin: 0;
    padding: 0;
    background-color: var(--color-background-muted-3x);
    list-style: none;
    max-height: 35vh;
    overflow-y: auto;

    li {
      margin: 0;
      padding: 1.6rem;
      line-height: 1;
      cursor: pointer;
      color: var(--color-foreground-muted-2x);
    }
    li[aria-selected="true"] {
      background-color: var(--color-background-muted-2x);
      color: var(--color-foreground);
    }

    &.open {
      opacity: 1;
    }
  }
`

export type RenderItemFunc<T> = (item: T, textKey?: keyof T) => JSX.Element

const defaultRenderItem: RenderItemFunc<any> = (item, textKey?) => {
  return <>{textKey ? item[textKey] : item.toString()}</>
}

export type DropdownProps<T> = {
  className?: string
  label?: string
  items: T[]
  propertyKey: keyof T
  labelKey?: keyof T
  renderItem: RenderItemFunc<T>
  defaultSelectedItem?: T | null | undefined
  placeholder?: string
  onChange?: (item: T | null) => void
  disabled?: boolean
}

export const Dropdown = <T extends {}>({
  className,
  label,
  items,
  propertyKey,
  defaultSelectedItem,
  placeholder,
  disabled,
  onChange,
  renderItem = defaultRenderItem,
}: DropdownProps<T>) => {
  const { isOpen, selectedItem, getToggleButtonProps, getLabelProps, getMenuProps, getItemProps } =
    useSelect({
      items,
      defaultSelectedItem,
    })

  useEffect(() => {
    if (selectedItem && onChange) onChange(selectedItem)
  }, [onChange, selectedItem])

  return (
    <Container className={classNames("dropdown", className)}>
      {label && <label {...getLabelProps()}>{label}</label>}
      <button
        type="button"
        {...getToggleButtonProps()}
        className={classNames(!!selectedItem && "hasValue")}
        disabled={disabled}
      >
        <span className="grow">{selectedItem ? renderItem(selectedItem) : placeholder}</span>
        <span>
          <ChevronDownIcon />
        </span>
      </button>
      <ul {...getMenuProps()} className={classNames(isOpen && "open")}>
        {isOpen &&
          items.map((item, index) => (
            <li key={item[propertyKey]} {...getItemProps({ item, index })}>
              {renderItem(item)}
            </li>
          ))}
      </ul>
    </Container>
  )
}
