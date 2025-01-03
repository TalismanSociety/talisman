import { Listbox } from "@headlessui/react"
import { ChevronDownIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { ReactNode } from "react"

import { SearchInput } from "@talisman/components/SearchInput"

export type DropdownOption = Record<string, unknown>

export type DropdownOptionRender<T extends DropdownOption> = (
  item: T,
  labelKey?: keyof T,
) => ReactNode

const DEFAULT_RENDER = <T extends DropdownOption>(item: T, labelKey?: keyof T): ReactNode => {
  return <>{labelKey ? item[labelKey] : item.toString()}</>
}

export type DropdownProps<T extends DropdownOption> = {
  label?: ReactNode
  items: T[]
  propertyKey: keyof T
  propertyLabel?: keyof T
  renderItem?: DropdownOptionRender<T>
  value?: T | null | undefined
  placeholder?: string | ReactNode
  onChange?: (item: T | null) => void
  disabled?: boolean
  className?: string
  buttonClassName?: string
  optionClassName?: string
  isSearchable?: boolean
  handleSearchChange?: (event: React.SetStateAction<string>) => void
  searchPlaceholder?: string
  searchLabel?: string
}

export const Dropdown = <T extends Record<string, unknown>>({
  className,
  buttonClassName,
  optionClassName,
  disabled,
  label,
  propertyKey,
  propertyLabel,
  items,
  value,
  placeholder,
  isSearchable,
  searchPlaceholder,
  searchLabel,
  renderItem = DEFAULT_RENDER,
  onChange,
  handleSearchChange,
}: DropdownProps<T>) => (
  <Listbox disabled={disabled} value={value} onChange={onChange}>
    {({ open }) => (
      <div className={className}>
        {label && <Listbox.Label className="text-body-secondary mb-8 block">{label}</Listbox.Label>}
        <div className={"text-body-secondary inline-block h-full max-h-[20rem] w-full"}>
          <Listbox.Button
            className={classNames(
              "bg-grey-800 enabled:hover:text-grey-300 disabled:bg-field disabled:text-body-disabled flex w-full items-center gap-8 p-8 text-left",
              open ? "rounded-t-sm" : "rounded-sm",
              buttonClassName,
            )}
          >
            <div className="flex flex-grow flex-col justify-center overflow-hidden">
              {value ? renderItem(value, propertyLabel) : placeholder}
            </div>
            {!disabled && <ChevronDownIcon className="shrink-0 text-[1.2em]" />}
          </Listbox.Button>
          <div className="relative w-full">
            <div className="scrollable scrollable-700 w-full">
              <Listbox.Options
                className={classNames(
                  "bg-grey-800 absolute right-0 top-0 z-10 rounded-sm",
                  !isSearchable && "rounded-b-sm",
                )}
              >
                {isSearchable && (
                  <div className="sticky top-0 z-10 space-y-6 px-6 pb-3 pt-6">
                    {searchLabel && (
                      <div className="text-body-secondary text-xs">{searchLabel}</div>
                    )}
                    <SearchInput
                      placeholder={searchPlaceholder ?? "Search..."}
                      onChange={handleSearchChange}
                      initialValue=""
                    />
                  </div>
                )}
                <div className="max-h-[30rem] overflow-y-auto overflow-x-hidden">
                  {items.map((item, i, arr) => (
                    <Listbox.Option
                      key={`${item[propertyKey]}-${i}` as string | number}
                      value={item}
                      className={classNames(
                        "bg-grey-800 hover:bg-grey-750 hover:text-grey-300 w-full max-w-full cursor-pointer overflow-hidden p-8",
                        "flex-grow flex-col justify-center",
                        i === arr.length - 1 && "rounded-b-sm",
                        optionClassName,
                      )}
                    >
                      {renderItem(item, propertyLabel)}
                    </Listbox.Option>
                  ))}
                </div>
              </Listbox.Options>
            </div>
          </div>
        </div>
      </div>
    )}
  </Listbox>
)
