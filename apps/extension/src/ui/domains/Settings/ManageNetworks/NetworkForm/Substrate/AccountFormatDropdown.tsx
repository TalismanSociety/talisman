import { shortenAddress } from "@talisman/util/shortenAddress"
import i18n from "i18next"
import { useCallback, useMemo } from "react"
import { Dropdown } from "talisman-ui"

type AccountFormatOptionProps = {
  title: string
  text: string
}

const AccountFormatOption = ({ title, text }: AccountFormatOptionProps) => {
  return (
    <div className="flex flex-col">
      <div className="text-xs">{title}</div>
      <div className="text-body-disabled text-tiny">{text}</div>
    </div>
  )
}

export const accountFormatOptions = [
  {
    label: (
      <AccountFormatOption
        title={i18n.t("Polkadot (default)")}
        text={shortenAddress("5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM")}
      />
    ),
    value: "*25519",
  },
  {
    label: (
      <AccountFormatOption
        title={i18n.t("Ethereum (e.g. Moonbeam)")}
        text={shortenAddress("0x0000000000000000000000000000000000000000")}
      />
    ),
    value: "secp256k1",
  },
]

export const AccountFormatDropdown = ({
  selectedFormat,
  onChange,
}: {
  selectedFormat: string | null
  onChange: (value: string | null) => void
}) => {
  const accountFormatOption = useMemo(
    () =>
      selectedFormat
        ? accountFormatOptions.find((option) => selectedFormat === option.value)
        : accountFormatOptions[0],
    [selectedFormat]
  )

  const handleAccountFormatChange = useCallback(
    (option: { label: JSX.Element; value: string } | null) => onChange(option?.value ?? "*25519"),
    [onChange]
  )

  return (
    <Dropdown
      items={accountFormatOptions}
      value={accountFormatOption}
      propertyKey="value"
      propertyLabel="label"
      onChange={handleAccountFormatChange}
    />
  )
}
