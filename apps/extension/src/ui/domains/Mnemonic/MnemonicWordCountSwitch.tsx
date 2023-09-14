import { classNames } from "@talismn/util"
import {
  CSSProperties,
  FC,
  ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"

const Button = forwardRef<
  HTMLButtonElement,
  { selected: boolean; onClick: () => void; children: ReactNode }
>(({ selected, children, onClick }, ref) => (
  <button
    type="button"
    ref={ref}
    disabled={selected}
    className={classNames(
      "z-10 px-[0.5em] transition-colors duration-150",
      selected && "text-body-black"
    )}
    onClick={onClick}
  >
    {children}
  </button>
))
Button.displayName = "Button"

type WordCountValue = 12 | 24

export const MnemonicWordCountSwitch: FC<{
  value: WordCountValue
  onChange: (value: WordCountValue) => void
  className?: string
}> = ({ value, className, onChange }) => {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<WordCountValue>(value)
  const ref12 = useRef<HTMLButtonElement>(null)
  const ref24 = useRef<HTMLButtonElement>(null)

  const [selectionOverlay, setSelectionOverlay] = useState<CSSProperties>({
    left: 0,
    width: 0,
  })

  useEffect(() => {
    if (!ref12.current || !ref24.current) return
    let button: HTMLButtonElement | null = null
    switch (selected) {
      case 12:
        button = ref12.current
        break
      case 24:
        button = ref24.current
        break
    }
    setSelectionOverlay({
      left: button?.offsetLeft || 0,
      width: button?.offsetWidth || 0,
    })
  }, [selected])

  const handleChange = useCallback(
    (newValue: WordCountValue) => () => {
      setSelected(newValue)
      if (onChange) onChange(newValue)
    },
    [onChange]
  )

  return (
    <div
      className={classNames(
        "bg-grey-800 text-body-secondary leading-paragraph inline-block rounded-full p-[0.2em] text-xs",
        className
      )}
    >
      <div className="relative z-0 flex items-center gap-[-0.5em]">
        <Button ref={ref12} selected={selected === 12} onClick={handleChange(12)}>
          {t("12-word")}
        </Button>
        <Button ref={ref24} selected={selected === 24} onClick={handleChange(24)}>
          {t("24-word")}
        </Button>
        <div
          className={classNames(
            "bg-primary absolute top-0 h-full rounded-full transition-all ease-in-out"
          )}
          style={selectionOverlay}
        />
      </div>
    </div>
  )
}
