import { classNames } from "@talismn/util"
import { FadeIn } from "@ui/components/FadeIn"
import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

const OptionButton = <O extends string>({
  className,
  selected,
  children,
  onClick,
  option,
}: {
  className?: string
  selected: boolean
  option: O
  onClick: (option: O, buttonRef: RefObject<HTMLButtonElement>) => void
  children: ReactNode
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // required to ensure the option is highlighted when initially rendered with selected = true
    if (selected) {
      onClick(option, buttonRef)
    }
  }, [selected, onClick, option])

  return (
    <button
      type="button"
      ref={buttonRef}
      disabled={selected}
      className={classNames(
        "z-10 h-full whitespace-pre px-7 py-2 transition-colors duration-150",
        selected && "text-body-black",
        className
      )}
      onClick={() => onClick(option, buttonRef)}
    >
      {children}
    </button>
  )
}

type OptionSwitchProps<O extends string> = {
  defaultOption?: O
  options: Array<[O, string]>
  className?: string
  optionButtonClassName?: string
  onChange?: (option: O) => void
}

export const OptionSwitch = <O extends string>({
  defaultOption,
  options,
  className,
  optionButtonClassName,
  onChange,
}: OptionSwitchProps<O>) => {
  const [selected, setSelected] = useState<O | undefined>(defaultOption)
  const [selectionOverlay, setSelectionOverlay] = useState<CSSProperties | null>(null)

  const handleChange = useCallback(
    (option: O, buttonRef: RefObject<HTMLButtonElement>) => {
      setSelected(option)
      setSelectionOverlay({
        left: buttonRef.current?.offsetLeft || 0,
        width: buttonRef.current?.offsetWidth || 0,
      })
      if (onChange) onChange(option)
    },
    [onChange]
  )

  return (
    <div
      className={classNames(
        "inline-block h-14 rounded-full p-[0.25em] text-body-secondary",
        className
      )}
    >
      <div className="relative z-0 flex h-full items-center gap-2">
        {options.map(([option, optionText]) => (
          <OptionButton
            className={optionButtonClassName}
            selected={selected === option}
            onClick={handleChange}
            key={option}
            option={option}
          >
            {optionText}
          </OptionButton>
        ))}
        {selectionOverlay && (
          <FadeIn>
            <div
              className="absolute top-0 h-full rounded-full bg-primary transition-all duration-150 ease-in-out"
              style={selectionOverlay}
            />
          </FadeIn>
        )}
      </div>
    </div>
  )
}
