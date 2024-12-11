import { classNames } from "@talismn/util"
import { Dropdown, DropdownOption, DropdownProps } from "talisman-ui"

export type NumberInputWithDropDownProps<T extends DropdownOption> = DropdownProps<T> & {
  inputFieldProps: React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >
  inputFieldLabel: string | number
  inputType: "string" | "number"
  inputPlaceholder: string
}

export const NumberInputWithDropDown = <T extends DropdownOption>({
  inputFieldProps,
  inputFieldLabel,
  inputType,
  inputPlaceholder,
  propertyKey,
  placeholder,
  items,
  value,
  renderItem,
  onChange,
}: NumberInputWithDropDownProps<T>) => {
  return (
    <div className="border-grey-750 bg-black-secondary flex h-[7rem] justify-between rounded-xl border-[1px] p-4">
      <div className="flex flex-col justify-center">
        <input
          type={inputType}
          inputMode={inputType === "number" ? "decimal" : "text"}
          placeholder={inputPlaceholder}
          autoComplete="off"
          className={classNames(
            "text-md peer min-w-0 appearance-none border-none bg-transparent font-bold leading-none text-white",
          )}
          {...inputFieldProps}
        />
        <div className="text-xs">{inputFieldLabel ?? ""}</div>
      </div>
      <Dropdown
        items={items}
        propertyKey={propertyKey}
        renderItem={renderItem}
        onChange={onChange}
        placeholder={placeholder}
        value={value}
        buttonClassName="h-full"
        optionClassName="flex flex-col justify-center"
      />
    </div>
  )
}
