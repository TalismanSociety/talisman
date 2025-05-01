import { SearchIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import {
  ChangeEventHandler,
  forwardRef,
  KeyboardEventHandler,
  ReactNode,
  useCallback,
  useDeferredValue,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { FormFieldInputContainerProps, FormFieldInputText, IconButton } from "talisman-ui"

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
  disabled?: boolean
  onChange?: (search: string) => void
  onSubmit?: () => void
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      containerClassName,
      small,
      autoFocus,
      placeholder,
      initialValue,
      after,
      disabled,
      onChange,
      onSubmit,
    },
    ref,
  ) => {
    const internalRef = useRef<HTMLInputElement>(null)

    // Merge the forwarded ref with the internal ref
    useImperativeHandle(ref, () => internalRef.current as HTMLInputElement, [internalRef])

    const [syncSearch, setSearch] = useState(initialValue ?? "")
    const search = useDeferredValue(syncSearch)

    const handleSearchChange: ChangeEventHandler<HTMLInputElement> = useCallback(
      (e) => {
        setSearch(e.target.value)
      },
      [setSearch],
    )

    const handleKeyUp: KeyboardEventHandler<HTMLInputElement> = useCallback(
      (e) => {
        if (e.key === "Enter") {
          onSubmit?.()
        }
      },
      [onSubmit],
    )

    useEffect(() => {
      onChange?.(search)
    }, [onChange, search])

    useEffect(() => {
      if (autoFocus) internalRef.current?.focus()
    }, [autoFocus])

    const containerProps = useMemo(
      () => ({
        small: small === undefined ? INPUT_CONTAINER_PROPS.small : small,
        className: classNames(INPUT_CONTAINER_PROPS.className, containerClassName),
      }),
      [containerClassName, small],
    )

    const handleClear = useCallback(() => {
      if (!internalRef.current) return
      setSearch("")
      internalRef.current.value = ""
      internalRef.current.blur()
    }, [setSearch])

    return (
      <FormFieldInputText
        ref={internalRef}
        className={classNames("text-base", className)}
        containerProps={containerProps}
        before={<SearchIcon className="text-body-disabled shrink-0" />}
        after={
          after ?? (
            <IconButton
              onClick={handleClear}
              className={classNames(search ? "visible" : "invisible")}
            >
              <XIcon />
            </IconButton>
          )
        }
        defaultValue={initialValue}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleSearchChange}
        onKeyUp={handleKeyUp}
      />
    )
  },
)

SearchInput.displayName = "SearchInput"
