import { SearchIcon } from "@talisman/theme/icons"
import { useDebouncedState } from "@ui/hooks/useDebouncedState"
import { ChangeEventHandler, FC, useCallback, useEffect } from "react"
import {
  FormFieldInputContainerProps,
  FormFieldInputText,
  FormFieldInputTextProps,
  classNames,
} from "talisman-ui"

const INPUT_CONTAINER_PROPS: FormFieldInputContainerProps = {
  small: true,
  className: "!px-8 h-[4.6rem] my-1 !bg-black-tertiary",
}

type SendFundsSearchInputProps = {
  className?: string
  placeholder?: string
  onChange?: (search: string) => void
}

export const SendFundsSearchInput: FC<SendFundsSearchInputProps> = ({
  className,
  onChange,
  placeholder,
}) => {
  const [search, setSearch] = useDebouncedState("")

  const handleSearchChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setSearch(e.target.value)
    },
    [setSearch]
  )

  useEffect(() => {
    onChange?.(search)
  }, [onChange, search])

  return (
    <FormFieldInputText
      className={classNames("text-base", className)}
      containerProps={INPUT_CONTAINER_PROPS}
      before={<SearchIcon className="text-body-disabled" />}
      placeholder={placeholder}
      onChange={handleSearchChange}
    />
  )
}
