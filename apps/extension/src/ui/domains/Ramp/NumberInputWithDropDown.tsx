import { classNames } from "@talismn/util"
import { Dropdown, DropdownOption, DropdownProps } from "talisman-ui"

export type NumberInputWithDropDownProps<T extends DropdownOption> = DropdownProps<T> & {
  inputFieldProps: React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >
  onInputChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleSearchChange?: (event: React.SetStateAction<string>) => void
  inputFieldLabel: string | number
  inputType: "string" | "number"
  inputPlaceholder: string
  isLoading?: boolean
  isSearchable?: boolean
  searchPlaceholder?: string
  searchLabel?: string
  minStep?: string
  errorMessage?: string | null
}

export const NumberInputWithDropDown = <T extends DropdownOption>({
  inputFieldProps,
  inputFieldLabel,
  inputType,
  inputPlaceholder,
  isLoading,
  searchPlaceholder,
  searchLabel,
  minStep,
  errorMessage,
  onInputChange,
  handleSearchChange,
  ...dropdownProps
}: NumberInputWithDropDownProps<T>) => {
  return (
    <>
      <div className="border-grey-750 bg-black-secondary flex h-[5.5rem] justify-between rounded-[12px] border-[1px] p-3 pl-8">
        <div className="flex flex-col justify-center">
          <input
            type={inputType}
            inputMode={inputType === "number" ? "decimal" : "text"}
            step={inputType === "number" ? (minStep ?? "0.01") : undefined}
            placeholder={inputPlaceholder}
            autoComplete="off"
            className={classNames(
              "text-md peer w-[15rem] min-w-0 appearance-none border-none bg-transparent font-bold leading-none text-white md:max-w-fit",
              isLoading && "text-body-disabled animate-pulse",
            )}
            {...inputFieldProps}
            onChange={onInputChange}
          />
          <div className={classNames("text-tiny", !inputFieldLabel && "invisible")}>
            {inputFieldLabel ?? "..."}
          </div>
        </div>
        <Dropdown
          {...dropdownProps}
          isSearchable
          handleSearchChange={handleSearchChange}
          searchPlaceholder={searchPlaceholder}
          searchLabel={searchLabel}
          onClear={dropdownProps.onClear}
        />
      </div>
      {errorMessage && <div className="text-tiny mt-1 text-red-500">{errorMessage}</div>}
    </>
  )
}
