import { SearchIcon, XIcon } from "@talismn/icons"
import {
  type FormFieldInputContainerProps,
  FormFieldInputText,
} from "@ui/components/FormFieldInputText"
import { IconButton } from "@ui/components/IconButton"
import { cn } from "@ui/util/cn"
import {
  type ChangeEventHandler,
  forwardRef,
  type KeyboardEventHandler,
  type ReactNode,
  useCallback,
  useDeferredValue,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"

const INPUT_CONTAINER_PROPS: FormFieldInputContainerProps = {
  small: true,
  className: "px-8! h-11.5 my-1 bg-black-tertiary!",
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
    ref
  ) => {
    const internalRef = useRef<HTMLInputElement>(null)

    // Merge the forwarded ref with the internal ref
    // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
    useImperativeHandle(ref, () => internalRef.current as HTMLInputElement, [internalRef])

    const [syncSearch, setSearch] = useState(initialValue ?? "")
    const search = useDeferredValue(syncSearch)

    const handleSearchChange: ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
      setSearch(e.target.value)
    }, [])

    const handleKeyUp: KeyboardEventHandler<HTMLInputElement> = useCallback(
      (e) => {
        if (e.key === "Enter") {
          onSubmit?.()
        }
      },
      [onSubmit]
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
        className: cn(INPUT_CONTAINER_PROPS.className, containerClassName),
      }),
      [containerClassName, small]
    )

    const handleClear = useCallback(() => {
      if (!internalRef.current) return
      setSearch("")
      internalRef.current.value = ""
      internalRef.current.blur()
    }, [])

    return (
      <FormFieldInputText
        ref={internalRef}
        className={cn("text-base", className)}
        containerProps={containerProps}
        before={<SearchIcon className="shrink-0 text-body-disabled" />}
        after={
          after ?? (
            <IconButton onClick={handleClear} className={cn(search ? "visible" : "invisible")}>
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
  }
)

SearchInput.displayName = "SearchInput"
