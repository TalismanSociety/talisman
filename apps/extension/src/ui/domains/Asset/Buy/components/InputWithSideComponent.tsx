import { classNames } from "@talismn/util"

export type InputWithSideComponentProps = {
  inputFieldProps: React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >
  inputType: "string" | "number"
  inputPlaceholder: string
  isLoading?: boolean
  isDisabled: boolean
  minStep?: string
  errorMessage?: string | null
  sideComponent: React.ReactNode
  onInputChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export const InputWithSideComponent = ({
  inputFieldProps,
  inputType,
  inputPlaceholder,
  isLoading,
  minStep,
  errorMessage,
  sideComponent,
  isDisabled,
  onInputChange,
}: InputWithSideComponentProps) => {
  return (
    <>
      <div className="border-grey-750 bg-black-secondary flex h-[5.5rem] justify-between rounded-[12px] border-[1px] p-3 pl-8">
        <div className="flex flex-col justify-center">
          <input
            disabled={isDisabled}
            type={inputType}
            inputMode={inputType === "number" ? "decimal" : "text"}
            step={inputType === "number" ? (minStep ?? "0.01") : undefined}
            placeholder={inputPlaceholder}
            autoComplete="off"
            className={classNames(
              "text-md peer w-[15rem] min-w-0 appearance-none border-none bg-transparent font-bold leading-none text-white md:max-w-fit",
              isLoading && "text-body-disabled animate-pulse",
              isDisabled && "cursor-not-allowed",
            )}
            {...inputFieldProps}
            onChange={onInputChange}
          />
        </div>
        {sideComponent}
      </div>
      {errorMessage && <div className="text-tiny mt-1 text-red-500">{errorMessage}</div>}
    </>
  )
}
