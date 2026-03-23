import { SearchIcon, XIcon } from "@talismn/icons"
import { FormFieldInputText } from "@ui/components/FormFieldInputText"
import { IconButton } from "@ui/components/IconButton"
import { cn } from "@ui/util/cn"
import { useCallback, useRef } from "react"
import { useEffectOnce } from "react-use"

type SearchInputControlledProps = {
  className?: string
  containerClassName?: string
  placeholder?: string
  isDisabled?: boolean
  value?: string
  autoFocus?: boolean
  onChange: React.ChangeEventHandler<HTMLInputElement>
  onClear: () => void
}

export const SearchInputControlled = ({
  className,
  containerClassName,
  value,
  placeholder,
  isDisabled,
  autoFocus,
  onChange,
  onClear,
}: SearchInputControlledProps) => {
  const ref = useRef<HTMLInputElement>(null)

  const handleClear = useCallback(() => {
    if (!ref.current) return
    onClear()
    ref.current.value = ""
    ref.current.blur()
  }, [onClear])

  useEffectOnce(() => {
    if (autoFocus) ref.current?.focus()
  })

  return (
    <FormFieldInputText
      ref={ref}
      className={cn("text-base", className)}
      containerProps={{ className: containerClassName }}
      before={<SearchIcon className="shrink-0 text-body-disabled" />}
      after={
        <IconButton onClick={handleClear} className={cn(value ? "visible" : "invisible")}>
          <XIcon />
        </IconButton>
      }
      placeholder={placeholder}
      disabled={isDisabled}
      onChange={onChange}
      value={value}
    />
  )
}
