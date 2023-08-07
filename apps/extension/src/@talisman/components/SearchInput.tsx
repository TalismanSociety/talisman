import { SearchIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { useDebouncedState } from "@ui/hooks/useDebouncedState"
import {
  ChangeEventHandler,
  FC,
  KeyboardEventHandler,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react"
import { FormFieldInputContainerProps, FormFieldInputText } from "talisman-ui"

const INPUT_CONTAINER_PROPS: FormFieldInputContainerProps = {
  small: true,
  className: "!px-8 h-[4.6rem] my-1 !bg-black-tertiary",
}

type SearchInputProps = {
  className?: string
  autoFocus?: boolean
  placeholder?: string
  after?: ReactNode
  onChange?: (search: string) => void
  onValidate?: () => void
}

export const SearchInput: FC<SearchInputProps> = ({
  className,
  autoFocus,
  placeholder,
  after,
  onChange,
  onValidate,
}) => {
  const ref = useRef<HTMLInputElement>(null)
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

  useEffect(() => {
    // set focus after render to prevent appear animations from flickering
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  return (
    <FormFieldInputText
      ref={ref}
      className={classNames("text-base", className)}
      containerProps={INPUT_CONTAINER_PROPS}
      before={<SearchIcon className="text-body-disabled" />}
      after={after}
      placeholder={placeholder}
      onChange={handleSearchChange}
      onKeyUp={handleKeyUp}
    />
  )
}
