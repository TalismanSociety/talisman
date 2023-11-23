import { SearchIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useDebouncedState } from "@ui/hooks/useDebouncedState"
import {
  ChangeEventHandler,
  FC,
  KeyboardEventHandler,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react"
import { FormFieldInputContainerProps, FormFieldInputText } from "talisman-ui"

const INPUT_CONTAINER_PROPS: FormFieldInputContainerProps = {
  small: true,
  className: "!px-8 h-[4.6rem] my-1 !bg-black-tertiary",
}

type SearchInputProps = {
  small?: boolean
  className?: string
  containerClassName?: string
  autoFocus?: boolean
  placeholder?: string
  initialValue?: string
  after?: ReactNode
  onChange?: (search: string) => void
  onValidate?: () => void
}

export const SearchInput: FC<SearchInputProps> = ({
  className,
  containerClassName,
  small,
  autoFocus,
  placeholder,
  initialValue,
  after,
  onChange,
  onValidate,
}) => {
  const ref = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useDebouncedState(initialValue ?? "", 200)

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

  const containerProps = useMemo(
    () => ({
      small: small === undefined ? INPUT_CONTAINER_PROPS.small : small,
      className: classNames(INPUT_CONTAINER_PROPS.className, containerClassName),
    }),
    [containerClassName, small]
  )

  return (
    <FormFieldInputText
      ref={ref}
      className={classNames("text-base", className)}
      containerProps={containerProps}
      before={<SearchIcon className="text-body-disabled shrink-0" />}
      after={after}
      defaultValue={initialValue}
      placeholder={placeholder}
      onChange={handleSearchChange}
      onKeyUp={handleKeyUp}
    />
  )
}
