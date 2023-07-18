import { ProviderType } from "@core/domains/sitesAuthorised/types"
import { classNames } from "@talismn/util"
import {
  CSSProperties,
  ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"

type ProviderSwitchProps = {
  defaultProvider?: ProviderType
  authorizedProviders?: ProviderType[]
  className?: string
  onChange?: (provider: ProviderType) => void
}

const DEFAULT_PROVIDERS: ProviderType[] = ["polkadot", "ethereum"]

const Button = forwardRef<
  HTMLButtonElement,
  { selected: boolean; authorised: boolean; onClick: () => void; children: ReactNode }
>(({ selected, authorised, children, onClick }, ref) => (
  <button
    type="button"
    ref={ref}
    disabled={!authorised || selected}
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

export const ProviderTypeSwitch = ({
  defaultProvider = "polkadot",
  authorizedProviders = DEFAULT_PROVIDERS,
  className,
  onChange,
}: ProviderSwitchProps) => {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<ProviderType>(defaultProvider)
  const refPolkadot = useRef<HTMLButtonElement>(null)
  const refEthereum = useRef<HTMLButtonElement>(null)

  const [selectionOverlay, setSelectionOverlay] = useState<CSSProperties>({
    left: 0,
    width: 0,
  })

  useEffect(() => {
    if (!refPolkadot.current || !refEthereum.current) return
    let button: HTMLButtonElement | null = null
    switch (selected) {
      case "polkadot":
        button = refPolkadot.current
        break
      case "ethereum":
        button = refEthereum.current
        break
    }
    setSelectionOverlay({
      left: button?.offsetLeft || 0,
      width: button?.offsetWidth || 0,
    })
  }, [selected])

  const handleChange = useCallback(
    (provider: ProviderType) => () => {
      setSelected(provider)
      if (onChange) onChange(provider)
    },
    [onChange]
  )

  return (
    <div
      className={classNames(
        "bg-grey-800 text-body-secondary leading-paragraph inline-block rounded-full p-[0.2em]",
        className
      )}
    >
      <div className="relative z-0 flex items-center gap-[-0.5em]">
        <Button
          ref={refPolkadot}
          selected={selected === "polkadot"}
          authorised={authorizedProviders.includes("polkadot")}
          onClick={handleChange("polkadot")}
        >
          {t("Polkadot")}
        </Button>
        <Button
          ref={refEthereum}
          selected={selected === "ethereum"}
          authorised={authorizedProviders.includes("ethereum")}
          onClick={handleChange("ethereum")}
        >
          {t("Ethereum")}
        </Button>
        <div
          className="bg-primary absolute top-0 h-full rounded-full transition-all duration-150 ease-in-out"
          style={selectionOverlay}
        />
      </div>
    </div>
  )
}
