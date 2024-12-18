import { classNames } from "@talismn/util"
import { Dropdown, DropdownOption, DropdownProps } from "talisman-ui"

export type NumberInputWithDropDownProps<T extends DropdownOption> = DropdownProps<T> & {
  inputFieldProps: React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >
  onInputChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  inputFieldLabel: string | number
  inputType: "string" | "number"
  inputPlaceholder: string
}

export const NumberInputWithDropDown = <T extends DropdownOption>({
  inputFieldProps,
  inputFieldLabel,
  inputType,
  inputPlaceholder,
  onInputChange,
  ...dropdownProps
}: NumberInputWithDropDownProps<T>) => {
  return (
    <div className="border-grey-750 bg-black-secondary flex h-[5.5rem] justify-between rounded-lg border-[1px] p-3 pl-8">
      <div className="flex flex-col justify-center">
        <input
          type={inputType}
          inputMode={inputType === "number" ? "decimal" : "text"}
          placeholder={inputPlaceholder}
          autoComplete="off"
          className={classNames(
            "text-md peer min-w-0 max-w-[15rem] appearance-none border-none bg-transparent font-bold leading-none text-white md:max-w-fit",
          )}
          {...inputFieldProps}
          onChange={onInputChange}
        />
        <div className="text-tiny">{inputFieldLabel ?? ""}</div>
      </div>
      <Dropdown {...dropdownProps} />
      {/* <div className="flex w-[9rem] items-center gap-4">
        <div className="flex-shrink-0">
          <img
            src={"https://assets.ramp.network/crypto-assets/polkadot.svg"}
            alt={"test"}
            className="h-[28px] w-[28px] rounded-full"
          />
        </div>
        <div className="min-w-0">
          <div className="text-white">DOT</div>
          <div className="text-tiny max-w-[9rem] truncate">Polkadot</div>
        </div>
      </div> */}
    </div>
  )
}
