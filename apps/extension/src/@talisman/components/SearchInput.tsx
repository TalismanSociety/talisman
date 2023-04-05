import { SearchIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { useDebouncedState } from "@ui/hooks/useDebouncedState"
import { ChangeEventHandler, FC, KeyboardEventHandler, useCallback, useEffect } from "react"
import { FormFieldInputContainerProps, FormFieldInputText } from "talisman-ui"

const INPUT_CONTAINER_PROPS: FormFieldInputContainerProps = {
  small: true,
  className: "!px-8 h-[4.6rem] my-1 !bg-black-tertiary",
}

type SearchInputProps = {
  className?: string
  autoFocus?: boolean
  placeholder?: string
  onChange?: (search: string) => void
  onValidate?: () => void
}

export const SearchInput: FC<SearchInputProps> = ({
  className,
  autoFocus,
  onChange,
  placeholder,
  onValidate,
}) => {
  const [search, setSearch] = useDebouncedState("", 200)

  const handleSearchChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setSearch(e.target.value)
    },
    [setSearch]
  )

  const handleKeyUp: KeyboardEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (e.key === "Enter") {
        onValidate?.()
      }
    },
    [onValidate]
  )

  useEffect(() => {
    onChange?.(search)
  }, [onChange, search])

  return (
    <FormFieldInputText
      className={classNames("text-base", className)}
      autoFocus={autoFocus}
      containerProps={INPUT_CONTAINER_PROPS}
      before={<SearchIcon className="text-body-disabled" />}
      placeholder={placeholder}
      onChange={handleSearchChange}
      onKeyUp={handleKeyUp}
    />
  )
}
