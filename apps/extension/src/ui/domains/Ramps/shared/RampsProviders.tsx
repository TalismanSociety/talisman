import { classNames, formatPrice, isNotNil } from "@talismn/util"
import { capitalize } from "lodash-es"
import { type FC, type ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"

import logoCoinbase from "../assets/logo-coinbase.svg?url"
import logoRamp from "../assets/logo-ramp.svg?url"
import type { RampsProvider } from "./types"

type RampsProviderPropsLoading = { type: "loading"; provider: RampsProvider }

type RampsProviderPropsError = {
  type: "error"
  provider: RampsProvider
  title?: ReactNode
  description?: ReactNode
}

type RampsProviderPropsAvailable = {
  type: "available"
  provider: RampsProvider
  title: ReactNode
  subtitle?: ReactNode
  currencyCode: string
  tokenSymbol: string
  tokenPrice: number | null
  fee: number
}

export type RampsProviderProps =
  | RampsProviderPropsLoading
  | RampsProviderPropsError
  | RampsProviderPropsAvailable

export const RampsProviders: FC<{
  options: RampsProviderProps[]
  selected: RampsProvider | undefined
  onSelect: (provider: RampsProvider) => void
}> = ({ options, selected, onSelect }) => {
  return (
    <div className="flex flex-col gap-6">
      {options.map((props) => (
        <RampsProviderButton
          key={props.provider}
          {...props}
          isSelected={selected === props.provider}
          onClick={() => onSelect(props.provider)}
        />
      ))}
    </div>
  )
}

const RampsProviderButton: FC<RampsProviderProps & { onClick: () => void; isSelected: boolean }> = (
  props
) => {
  switch (props.type) {
    case "loading":
      return <RampsProviderButtonSkeleton {...props} />
    case "error":
      return <RampsProviderButtonError {...props} />
    case "available":
      return <RampsProviderButtonAvailable {...props} />
  }
}

const RampsProviderButtonAvailable: FC<
  RampsProviderPropsAvailable & { onClick: () => void; isSelected: boolean }
> = ({
  provider,
  isSelected,
  title,
  subtitle,
  tokenSymbol,
  currencyCode,
  tokenPrice,
  fee,
  onClick,
}) => {
  const { t } = useTranslation()

  const formattedTokenPrice = useMemo(() => {
    if (!isNotNil(tokenPrice)) return null
    return formatPrice(tokenPrice, currencyCode, true)
  }, [tokenPrice, currencyCode])

  const formattedFee = useMemo(() => formatPrice(fee, currencyCode, true), [fee, currencyCode])

  return (
    <button
      type="button"
      className={classNames(
        "flex h-[9.2rem] flex-col justify-between gap-8 rounded border bg-grey-900 p-6 text-left leading-paragraph",
        isSelected
          ? "border-body bg-grey-850 text-body"
          : "border-grey-700 text-body-secondary enabled:hover:border-grey-500 enabled:hover:bg-grey-850"
      )}
      onClick={onClick}
    >
      <div className="flex justify-between">
        <div className="flex flex-col gap-2">
          <div className="font-bold text-sm">{title}</div>
          <div className="text-body-secondary text-tiny">{subtitle}</div>
        </div>
        <div className="text-body-secondary text-xs">
          <ProviderLabel provider={provider} />
        </div>
      </div>
      <div className="flex gap-8 text-tiny">
        {formattedTokenPrice && (
          <div>
            1 {tokenSymbol} ≈ {formattedTokenPrice}
          </div>
        )}
        <div>
          {t("Fee")} {formattedFee}
        </div>
      </div>
    </button>
  )
}

const RampsProviderButtonSkeleton: FC<RampsProviderPropsLoading> = ({ provider }) => (
  <div className="flex h-[9.2rem] flex-col justify-between gap-8 rounded border border-grey-700 p-6 text-left text-body-disabled leading-paragraph">
    <div className="flex justify-between">
      <div className="flex flex-col gap-2">
        <div className="animate-pulse rounded-xs bg-body-disabled font-bold text-sm">
          X.XXXXXX XXX
        </div>
        <div className="animate-pulse rounded-xs bg-body-disabled text-tiny">$XXXX.XX</div>
      </div>
      <div>
        <div className="text-xs">
          <ProviderLabel provider={provider} />
        </div>
      </div>
    </div>
    <div className="flex gap-8 text-tiny">
      <div className="animate-pulse rounded-xs bg-body-disabled">1 XXX ≈ $XXXX.XX</div>
      <div className="animate-pulse rounded-xs bg-body-disabled">Fee ~$X.XX</div>
    </div>
  </div>
)

const RampsProviderButtonError: FC<RampsProviderPropsError> = ({
  provider,
  title,
  description,
}) => (
  <div className="flex h-[9.2rem] flex-col justify-between gap-8 rounded border border-grey-700 p-6 text-left text-body-secondary leading-paragraph">
    <div className="flex justify-between">
      <div className="flex flex-col gap-2">
        <div className="text-sm">{title}</div>
        <div className="text-tiny">{description}</div>
      </div>
      <div className="text-xs">
        <ProviderLabel provider={provider} />
      </div>
    </div>
    <div className="flex gap-8 text-tiny">
      <div></div>
      <div></div>
    </div>
  </div>
)

const ProviderLabel: FC<{ provider: RampsProvider }> = ({ provider }) => {
  const logo = useMemo(() => {
    switch (provider) {
      case "coinbase":
        return logoCoinbase
      case "ramp":
        return logoRamp
    }
  }, [provider])

  return (
    <span className="inline-flex items-center gap-2 text-body-secondary text-xs">
      <span
        className={classNames(
          "inline-block size-8 rounded-full",
          provider === "ramp" && "bg-white p-1" // figma didnt use an svg, wrap the official one to make it look as expected
        )}
      >
        <img src={logo} alt="" className="size-full" />
      </span>
      <span>{capitalize(provider)}</span>
    </span>
  )
}
