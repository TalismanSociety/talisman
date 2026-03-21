import type { Network, NetworkId } from "@talismn/chaindata-provider"
import { ChevronRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkOptionsModal } from "@ui/domains/Portfolio/NetworkOptionsModal"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import type { NetworkOption } from "@ui/state/portfolio"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

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
        })
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
          "flex h-[3.5rem] w-full items-center gap-6 overflow-hidden rounded-sm px-8",
          "bg-grey-850 text-body-secondary enabled:hover:bg-grey-800 enabled:hover:text-body",
          className
        )}
        onClick={open}
      >
        <div>
          <NetworkLogo networkId={option?.id} className="text-[1.5rem]" />
        </div>
        <div className="grow truncate text-left text-body">{option?.name ?? t("All Networks")}</div>
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
