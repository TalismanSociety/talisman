import { FadeIn } from "@talisman/components/FadeIn"
import { classNames } from "@talismn/util"
import {
  CSSProperties,
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

const OptionButton = <O extends string>({
  selected,
  children,
  onClick,
  option,
}: {
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
        "z-10 h-full px-7 py-2 transition-colors duration-150",
        selected && "text-body-black"
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
  onChange?: (option: O) => void
}

export const OptionSwitch = <O extends string>({
  defaultOption,
  options,
  className,
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
        "text-body-secondary inline-block h-14 rounded-full p-[0.25em]",
        className
      )}
    >
      <div className="relative z-0 flex h-full items-center gap-2">
        {options.map(([option, optionText]) => (
          <OptionButton
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
              className="bg-primary absolute top-0 h-full rounded-full transition-all duration-150 ease-in-out"
              style={selectionOverlay}
            />
          </FadeIn>
        )}
      </div>
    </div>
  )
}
