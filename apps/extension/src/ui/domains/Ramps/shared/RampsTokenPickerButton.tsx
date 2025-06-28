import { Token, TokenId } from "@talismn/chaindata-provider"
import { PlusIcon } from "@talismn/icons"
import { TokenRatesList } from "@talismn/token-rates"
import { classNames } from "@talismn/util"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Drawer, useOpenClose } from "talisman-ui"

import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { useNetworkById } from "@ui/state"

import { RampsTokenPicker } from "./RampsTokenPicker"

export const RampsTokenPickerButton: FC<{
  value: TokenId | undefined
  tokens: Token[] | undefined
  tokenRates: TokenRatesList | null | undefined
  onSelect: (tokenId: string) => void
}> = ({ value, tokens, tokenRates, onSelect }) => {
  const [selected, setSelected] = useState(value)
  const { open, close, isOpen } = useOpenClose()

  const token = useMemo(() => tokens?.find((t) => t.id === value), [tokens, value])

  const handleOpen = useCallback(() => {
    setSelected(value)
    open()
  }, [open, value])

  const handleSelect = useCallback(
    (currency: string) => {
      onSelect(currency)
      close()
    },
    [close, onSelect],
  )

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={!tokens}
        className={classNames(
          "border-grey-750 bg-grey-800 focus-visible:border-grey-600 flex h-full w-[14rem] items-center gap-4 rounded-[12px] border px-4 py-3",
          "enabled:hover:bg-grey-750 disabled:opacity-80 disabled:grayscale",
        )}
      >
        {token ? <TokenContent token={token} /> : <EmptyContent />}
      </button>
      <Drawer
        anchor="right"
        isOpen={isOpen}
        containerId="ramp-container"
        className="size-full bg-black"
      >
        <RampsTokenPicker
          selected={selected}
          tokens={tokens}
          tokenRates={tokenRates}
          onClose={close}
          onSelect={handleSelect}
        />
      </Drawer>
    </>
  )
}

const TokenContent: FC<{ token: Token }> = ({ token }) => {
  const network = useNetworkById(token.networkId)

  return (
    <div className="flex items-center gap-4 truncate text-left">
      <div className="bg-body-disabled size-14 shrink-0 rounded-full">
        <TokenLogo tokenId={token.id} className="size-14" />
      </div>
      <div className="min-w-0 text-[16px]">
        <div className="text-white">{token.symbol}</div>
        <div className="text-tiny truncate">{network?.name ?? null}</div>
      </div>
    </div>
  )
}

const EmptyContent: FC = () => {
  const { t } = useTranslation()

  return (
    <div className="flex w-full items-center gap-3">
      <div className="flex items-center justify-center rounded-full bg-[#D5FF5C] bg-opacity-10">
        <PlusIcon className="text-primary-500 m-[0.3rem] size-10" />
      </div>
      <div className="text-xs text-white">{t("Select token")}</div>
    </div>
  )
}
