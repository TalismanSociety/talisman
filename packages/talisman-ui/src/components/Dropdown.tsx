import { Listbox } from "@headlessui/react"
import { ChevronDownIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { ReactNode } from "react"

export type DropdownOption = Record<string, unknown>

export type DropdownOptionRender<T extends DropdownOption> = (
  item: T,
  labelKey?: keyof T
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
  placeholder?: string
  onChange?: (item: T | null) => void
  disabled?: boolean
  className?: string
  buttonClassName?: string
  optionClassName?: string
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
  renderItem = DEFAULT_RENDER,
  onChange,
}: DropdownProps<T>) => (
  <Listbox disabled={disabled} value={value} onChange={onChange}>
    {({ open }) => (
      <div className={className}>
        {label && <Listbox.Label className="text-body-secondary mb-8 block">{label}</Listbox.Label>}
        <div className={"text-body-secondary inline-block max-h-[20rem] w-full"}>
          <Listbox.Button
            className={classNames(
              "bg-grey-800 enabled:hover:text-grey-300 disabled:bg-field disabled:text-body-disabled flex w-full items-center gap-8 p-8 text-left",
              open ? "rounded-t-sm" : "rounded-sm",
              buttonClassName
            )}
          >
            <div className="flex flex-grow flex-col justify-center overflow-hidden">
              {value ? renderItem(value, propertyLabel) : placeholder}
            </div>
            {!disabled && <ChevronDownIcon className="shrink-0 text-[1.2em]" />}
          </Listbox.Button>
          <div className="relative w-full">
            <div className="bg-grey-800 scrollable scrollable-700 absolute left-0 top-0 z-10 max-h-[30rem] w-full overflow-y-auto overflow-x-hidden rounded-b-sm">
              <Listbox.Options>
                {items.map((item, i, arr) => (
                  <Listbox.Option
                    key={item[propertyKey] as string | number}
                    value={item}
                    className={classNames(
                      "bg-grey-800 hover:bg-grey-750 hover:text-grey-300 w-full max-w-full cursor-pointer overflow-hidden p-8",
                      "flex-grow flex-col justify-center",
                      i === arr.length - 1 && "rounded-b-sm",
                      optionClassName
                    )}
                  >
                    {renderItem(item, propertyLabel)}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </div>
        </div>
      </div>
    )}
  </Listbox>
)
