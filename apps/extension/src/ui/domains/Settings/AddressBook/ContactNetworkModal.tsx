import { Network, NetworkId } from "@talismn/chaindata-provider"
import { ChevronRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useOpenClose } from "talisman-ui"

import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkOptionsModal } from "@ui/domains/Portfolio/NetworkOptionsModal"
import { NetworkOption } from "@ui/state"

export const ContactNetworkPickerButton: FC<{
  networks: Network[]
  selected: NetworkId | null
  onChange: (networkId: string | null) => void
  containerId?: string
  className?: string
}> = ({ networks, selected, onChange, className, containerId }) => {
  const { t } = useTranslation()
  const { isOpen, open, close } = useOpenClose()

  const options = useMemo(() => {
    const networkOptions = networks
      .map(
        (network): NetworkOption => ({
          id: network.id,
          name: network.name,
          networkIds: [network.id],
        }),
      )
      .sort((a, b) => a.name.localeCompare(b.name))

    return [
      ...networkOptions.filter(({ id }) => selected === id),
      ...networkOptions.filter(({ id }) => selected !== id),
    ]
  }, [networks, selected])

  const option = useMemo(() => options.find(({ id }) => id === selected), [options, selected])

  const handleOptionChange = (newOption: NetworkOption | null) => {
    onChange(newOption?.id ?? null)
    close()
  }

  return (
    <>
      <button
        type="button"
        className={classNames(
          "flex h-[5.6rem] w-full items-center gap-6 overflow-hidden rounded-sm px-8",
          "bg-grey-850 enabled:hover:bg-grey-800 text-body-secondary enabled:hover:text-body",
          className,
        )}
        onClick={open}
      >
        <div>
          <NetworkLogo networkId={option?.id} className="text-[2.4rem]" />
        </div>
        <div className="text-body grow truncate text-left">{option?.name ?? t("All Networks")}</div>
        <ChevronRightIcon className="size-12" />
      </button>
      <NetworkOptionsModal
        isOpen={isOpen}
        selected={option ?? null}
        options={options}
        onChange={handleOptionChange}
        onClose={close}
        containerId={containerId}
      />
    </>
  )
}
