import { SearchIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useCallback, useRef } from "react"
import { useEffectOnce } from "react-use"
import { FormFieldInputText, IconButton } from "talisman-ui"

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
      className={classNames("text-base", className)}
      containerProps={{ className: containerClassName }}
      before={<SearchIcon className="text-body-disabled shrink-0" />}
      after={
        <IconButton onClick={handleClear} className={classNames(value ? "visible" : "invisible")}>
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
